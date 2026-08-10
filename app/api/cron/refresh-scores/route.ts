import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { calculateScoreForWallets, persistScore, recalculateRanks } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { refreshXProfiles } from "@/lib/x-profiles";

 type WalletRow = {
  user_id: string;
  address: string;
  wallet_slot: "human" | "agent";
  verified_at: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("user_id,address,wallet_slot,verified_at")
    .in("wallet_slot", ["human", "agent"])
    .order("verified_at", { ascending: false });

  if (error) throw error;

  const walletGroups = getWalletGroupsByUser((wallets || []) as WalletRow[]).slice(0, env.CRON_REFRESH_LIMIT);
  const refreshed: Array<{ userId: string; score: number; nftCount: number }> = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const group of walletGroups) {
    try {
      const result = await calculateScoreForWallets(group.userId, group.wallets.map((wallet) => wallet.address));
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
  }

  if (refreshed.length > 0) {
    await recalculateRanks();
  }

  // Best-effort X profile refresh (handle/name/avatar). No-op without X_BEARER_TOKEN.
  let profilesUpdated = 0;
  try {
    profilesUpdated = await refreshXProfiles(walletGroups.map((group) => group.userId));
  } catch {
    // ignore — profile refresh is non-critical
  }

  return NextResponse.json({
    ok: true,
    checked: walletGroups.length,
    refreshed: refreshed.length,
    failed: failed.length,
    profilesUpdated,
    failures: failed.slice(0, 10)
  });
}

function isAuthorizedCronRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;

  if (expected && authorization === expected) return true;
  if (!expected && request.headers.get("user-agent")?.includes("vercel-cron")) return true;

  return false;
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
