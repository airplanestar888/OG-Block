import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { recalculateRanks } from "@/lib/scoring";
import { reevaluateFailedContracts } from "@/lib/nft/contracts";
import { scoreRules } from "@/lib/config/score-rules";
import { env } from "@/lib/env";

// Re-scoring contracts and rebuilding ranks is cheap (no per-wallet NFT scan),
// so a modest function budget is plenty.
export const maxDuration = 60;

/**
 * Admin "refresh all" — REDESIGNED.
 *
 * Points are captured when a wallet is verified or its owner refreshes from the
 * dashboard (that path registers + scores the wallet's contracts). This admin
 * pass therefore does NOT re-scan wallets. It only:
 *   1. Re-evaluates contracts whose last evaluation FAILED (e.g. a transient
 *      BaseScan error), so legitimate NFTs aren't stuck at 0.
 *   2. Recalculates every profile's score from the contract registry.
 *   3. Rebuilds leaderboard ranks.
 */
export async function POST() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (!rateLimit(`admin-refresh-all:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Retry contracts that failed evaluation.
    const reevaluated = await reevaluateFailedContracts(50);

    // 2. Recalculate each user's score from the registry.
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

    // 3. Rebuild ranks.
    await recalculateRanks();

    return NextResponse.json({ ok: true, reevaluated, rescored, total: (users || []).length });
  } catch (err) {
    console.error("admin refresh-all failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}

/**
 * Recompute one user's score purely from stored holdings + contract registry.
 * No external NFT calls — this is what makes the admin pass fast and safe.
 */
async function rescoreUserFromRegistry(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: holdings } = await supabase
    .from("nft_holdings")
    .select("contract_address,token_id,metadata_json")
    .eq("user_id", userId);

  if (!holdings || holdings.length === 0) return;

  const addresses = [...new Set(holdings.map((h) => (h.contract_address as string).toLowerCase()))];
  const { data: contracts } = await supabase
    .from("nft_contracts")
    .select("contract_address,is_spam,is_verified")
    .in("contract_address", addresses);

  const byAddress = new Map((contracts || []).map((c) => [c.contract_address as string, c]));

  // Keep only NFTs whose contract is non-spam AND (if required) verified.
  const valid = holdings.filter((h) => {
    const c = byAddress.get((h.contract_address as string).toLowerCase());
    if (!c) return false; // not yet evaluated → don't count yet
    if (c.is_spam === true) return false; // spam → 0
    if (env.NFT_REQUIRE_VERIFIED_CONTRACT && c.is_verified !== true) return false; // unverified → 0
    return true;
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
