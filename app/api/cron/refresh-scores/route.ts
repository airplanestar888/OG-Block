import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { calculateScoreForWallets, persistScore, recalculateRanks } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { healStaleAvatars } from "@/lib/x-profiles";

 type WalletRow = {
  user_id: string;
  address: string;
  wallet_slot: "human" | "agent";
  verified_at: string | null;
};

// A full pass scans every user's wallets against Alchemy + BaseScan and can
// run past 4 minutes sequentially — Vercel kills the invocation around 270s,
// which silently dropped entire daily runs (nothing persisted, no response).
// Declare the ceiling explicitly, scan with a small worker pool + per-user
// timeout so one slow scan can't eat the run, and stop starting new scans
// past a cutoff so the invocation ALWAYS finishes with a JSON summary.
// Refresh the stalest profiles first (never-scored users before scored ones)
// so a truncated run defers the freshest users, not the same tail every day.
export const maxDuration = 300;
const CONCURRENCY = 4;
const WORKER_CUTOFF_MS = 90_000;
// No scan may extend past this point from run start — Vercel kills the
// invocation around 270s, so leave tail room for recalculateRanks + response.
// The per-user timeout is whatever remains until this deadline, which gives
// whale wallets (500+ contracts, ~2-4 min scans, ordered stalest-first) room
// while capping every scan against the platform kill.
const USER_DEADLINE_MS = 240_000;
const MIN_SCAN_BUDGET_MS = 10_000;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase = getSupabaseAdmin();
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("user_id,address,wallet_slot,verified_at")
    .in("wallet_slot", ["human", "agent"])
    .order("verified_at", { ascending: false });

  if (error) throw error;

  // Refresh the stalest profiles first (never-scored users before scored
  // ones), so a truncated run defers the freshest users, not the same tail
  // every day.
  const { data: scoreStamps } = await supabase
    .from("scores")
    .select("user_id,last_calculated_at");
  const lastRunByUser = new Map(
    (scoreStamps || []).map((row) => [row.user_id, row.last_calculated_at as string])
  );

  const walletGroups = getWalletGroupsByUser((wallets || []) as WalletRow[])
    .sort((a, b) => {
      const stampA = lastRunByUser.get(a.userId);
      const stampB = lastRunByUser.get(b.userId);
      if (!stampA && !stampB) return 0;
      if (!stampA) return -1;
      if (!stampB) return 1;
      return stampA.localeCompare(stampB);
    })
    .slice(0, env.CRON_REFRESH_LIMIT);

  const refreshed: Array<{ userId: string; score: number; nftCount: number }> = [];
  const failed: Array<{ userId: string; error: string }> = [];

  // Cursor-based worker pool: cursor only advances between awaits on the
  // single JS thread, so concurrent workers can't claim the same group.
  const queue = [...walletGroups];
  let cursor = 0;

  const runOne = async (group: { userId: string; wallets: WalletRow[] }) => {
    try {
      const budgetMs = startedAt + USER_DEADLINE_MS - Date.now();
      if (budgetMs < MIN_SCAN_BUDGET_MS) {
        throw new Error(`Skipped: no time budget left for user ${group.userId}`);
      }
      const result = await withTimeout(
        calculateScoreForWallets(group.userId, group.wallets.map((wallet) => wallet.address)),
        budgetMs,
        `Scan for user ${group.userId} timed out`
      );
      await persistScore(group.userId, result, { recalculateRank: false });
      refreshed.push({
        userId: group.userId,
        score: result.score,
        nftCount: result.nftCount
      });
    } catch (error) {
      failed.push({
        userId: group.userId,
        error: error instanceof Error ? error.message : "Unknown refresh error"
      });
    }
  };

  const worker = async () => {
    while (cursor < queue.length) {
      if (Date.now() - startedAt > WORKER_CUTOFF_MS) return;
      const group = queue[cursor];
      cursor += 1;
      await runOne(group);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
  );
  const skipped = queue.length - cursor;

  if (refreshed.length > 0) {
    await recalculateRanks();
  } else {
    // Backstop: if every refresh failed (e.g. NFT provider outage), users who
    // registered since the last successful run still have rank = null while
    // their score is already stored. Re-rank whenever null ranks exist.
    const { count } = await supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .is("rank", null);
    if (count && count > 0) await recalculateRanks();
  }

  // NOTE: Full X profile refresh stays disabled to avoid consuming X API
  // credits (profile data is captured on each user login). The avatar
  // self-heal below is the only exception: it fires at most 1 X batch per
  // run, only for avatars already proven dead, so cost is ~zero.
  // It runs in the tail — after ranks are done — with its own guard so it
  // can never push the invocation into the Vercel ~270s kill.
  let avatars = { checked: 0, refreshed: 0, dead: 0 };
  if (Date.now() - startedAt < 200_000) {
    try {
      avatars = await healStaleAvatars(30);
    } catch {
      // Avatar hygiene must never fail the scoring run.
    }
  }

  return NextResponse.json({
    ok: true,
    checked: walletGroups.length,
    refreshed: refreshed.length,
    failed: failed.length,
    skipped,
    avatars,
    durationMs: Date.now() - startedAt,
    failures: failed.slice(0, 10)
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function isAuthorizedCronRequest(request: NextRequest) {
  // CRON_SECRET is required. Never fall back to User-Agent (spoofable).
  if (!env.CRON_SECRET) return false;
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${env.CRON_SECRET}`;
}

function getWalletGroupsByUser(wallets: WalletRow[]) {
  const groups = new Map<string, Map<WalletRow["wallet_slot"], WalletRow>>();

  for (const wallet of wallets) {
    const existing = groups.get(wallet.user_id) || new Map<WalletRow["wallet_slot"], WalletRow>();
    if (!existing.has(wallet.wallet_slot)) {
      existing.set(wallet.wallet_slot, wallet);
    }
    groups.set(wallet.user_id, existing);
  }

  return [...groups.entries()].map(([userId, slots]) => ({
    userId,
    wallets: [...slots.values()]
  }));
}
