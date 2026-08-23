import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateScoreForWallets, persistScore, recalculateRanks } from "@/lib/scoring";

// Refreshing every user hits the NFT provider several times each; give it room.
export const maxDuration = 300;

type WalletRow = { user_id: string; address: string; wallet_slot: "human" | "agent" };

// Maximum wall-clock time we spend refreshing users. Keep this well under the
// *tightest* proxy in front of the function (Vercel's edge proxy can 504 a
// request in ~100s even when maxDuration is 300), so the loop always exits
// in time to recalculate ranks and return JSON. Admin re-runs the button to
// continue through the remaining profiles — each run resumes where the last
// one stopped.
const TIME_BUDGET_MS = 75_000;

// Refresh a few users concurrently. calculateScoreForWallets already
// parallelizes its per-contract lookups, so 3 at a time roughly triples
// throughput per run without tripping Alchemy/BaseScan rate limits.
const CONCURRENCY = 3;

export async function POST() {
  try {
    const user = await getOrCreateCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Each run is short and resumable, so allow a generous cadence — the admin
    // may need several runs back to back to chew through the full roster.
    if (!rateLimit(`admin-refresh-all:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
    }

    const supabase = getSupabaseAdmin();
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
          console.error(`admin refresh-all failed for ${userId}:`, err instanceof Error ? err.message : err);
        }
      }
    });
    await Promise.all(workers);

    const processed = refreshed + failed.length;
    const remaining = groups.size - processed;

    // Always recalculate, even on a partial run — this is the only pass that
    // assigns ranks to users who registered since the last full refresh.
    if (refreshed > 0) await recalculateRanks();

    return NextResponse.json({
      ok: true,
      total: groups.size,
      refreshed,
      failed: failed.length,
      remaining
    });
  } catch (err) {
    console.error("admin refresh-all failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
