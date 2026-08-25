import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recalculateRanks, calculateScoreForWallets, persistScore } from "@/lib/scoring";
import { reevaluateFailedContracts, isCounted, getContractRecords } from "@/lib/nft/contracts";
import { fetchAllUserHoldings } from "@/lib/holdings";
import { scoreRules } from "@/lib/config/score-rules";

export const maxDuration = 300;
const TIME_BUDGET_MS = 75_000;

type WalletRow = { user_id: string; address: string; wallet_slot: "human" | "agent" };

/**
 * Admin refresh — two modes:
 *   POST {}                  → rescore from registry + rebuild ranks (fast, no wallet scan)
 *   POST { "rescan": true }  → full re-scan of every wallet from Alchemy, rebuild
 *                              nft_holdings, then rescore + rank. Use once to repair
 *                              holdings that were wrongly filtered by the old code.
 */
export async function POST(request: Request) {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!rateLimit(`admin-refresh-all:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
    }

    let rescan = false;
    try {
      const body = await request.json();
      rescan = body?.rescan === true;
    } catch {
      rescan = false;
    }

    const supabase = getSupabaseAdmin();

    if (rescan) {
      return await fullRescan(supabase);
    }

    // Default: registry-only rescore (cheap).
    const reevaluated = await reevaluateFailedContracts(50);
    const { data: users } = await supabase.from("scores").select("user_id");
    let rescored = 0;
    for (const row of users || []) {
      try {
        await rescoreUserFromRegistry(row.user_id);
        rescored += 1;
      } catch (err) {
        console.error(`rescore failed for ${row.user_id}:`, err instanceof Error ? err.message : err);
      }
    }
    await recalculateRanks();
    return NextResponse.json({ ok: true, mode: "rescore", reevaluated, rescored, total: (users || []).length });
  } catch (err) {
    console.error("admin refresh-all failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}

/** Full re-scan: rebuild nft_holdings from Alchemy for every wallet, then score. */
async function fullRescan(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("user_id,address,wallet_slot")
    .in("wallet_slot", ["human", "agent"]);
  if (error) throw error;

  const groups = new Map<string, string[]>();
  for (const w of (wallets || []) as WalletRow[]) {
    const list = groups.get(w.user_id) || [];
    list.push(w.address);
    groups.set(w.user_id, list);
  }

  const entries = [...groups.entries()];
  const startedAt = Date.now();
  const failed: string[] = [];
  let refreshed = 0;
  let nextIndex = 0;

  const CONCURRENCY = 3;
  const workers = Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (nextIndex < entries.length && Date.now() - startedAt <= TIME_BUDGET_MS) {
      const index = nextIndex;
      nextIndex += 1;
      const [userId, addrs] = entries[index];
      try {
        const result = await calculateScoreForWallets(userId, addrs);
        await persistScore(userId, result, { recalculateRank: false });
        refreshed += 1;
      } catch (err) {
        failed.push(userId);
        console.error(`rescan failed for ${userId}:`, err instanceof Error ? err.message : err);
      }
    }
  });
  await Promise.all(workers);

  if (refreshed > 0) await recalculateRanks();
  const remaining = groups.size - refreshed - failed.length;
  return NextResponse.json({
    ok: true,
    mode: "rescan",
    refreshed,
    failed: failed.length,
    remaining,
    total: groups.size
  });
}

/**
 * Recompute one user's score purely from stored holdings + contract registry.
 * No external NFT calls — this is what makes the admin pass fast and safe.
 */
async function rescoreUserFromRegistry(userId: string) {
  const supabase = getSupabaseAdmin();

  const holdings = await fetchAllUserHoldings(userId);

  if (!holdings || holdings.length === 0) return;

  const addresses = [...new Set(holdings.map((h) => (h.contract_address as string).toLowerCase()))];
  const contracts = await getContractRecords(addresses);

  const byAddress = new Map(contracts.map((c) => [c.contract_address.toLowerCase(), c]));

  // Keep only NFTs whose contract counts (verified overrides spam).
  const valid = holdings.filter((h) => {
    const c = byAddress.get((h.contract_address as string).toLowerCase());
    if (!c) return false; // not yet evaluated → don't count yet
    return isCounted(c);
  });

  // Score from the valid holdings (mirror calculateFromHoldings).
  let score = valid.length > 0 ? scoreRules.points.holdsProjectNft : 0;
  score += Math.max(0, valid.length - 1) * scoreRules.points.eachAdditionalNft;
  for (const h of valid) {
    const attrs = (h.metadata_json as { attributes?: unknown })?.attributes;
    if (Array.isArray(attrs)) {
      const rare = attrs.some((a) => {
        const t = a as { trait_type?: unknown; value?: unknown };
        return scoreRules.rareTraits.some((r) => r.trait_type === t.trait_type && r.value === t.value);
      });
      if (rare) score += scoreRules.points.rareTrait;
    }
    const tokenId = Number(h.token_id);
    if (Number.isFinite(tokenId) && tokenId < scoreRules.earlyTokenThreshold) {
      score += scoreRules.points.earlyTokenId;
    }
  }

  const { data: current } = await supabase
    .from("scores")
    .select("is_og")
    .eq("user_id", userId)
    .maybeSingle();

  await supabase.from("scores").upsert(
    {
      user_id: userId,
      score,
      nft_count: valid.length,
      is_og: current?.is_og ?? false,
      last_calculated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}
