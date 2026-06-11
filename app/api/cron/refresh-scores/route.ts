import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { calculateScore, persistScore, recalculateRanks } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type WalletRow = {
  user_id: string;
  address: string;
  verified_at: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("user_id,address,verified_at")
    .order("verified_at", { ascending: false });

  if (error) throw error;

  const latestWallets = getLatestWalletsByUser((wallets || []) as WalletRow[]).slice(0, env.CRON_REFRESH_LIMIT);
  const refreshed: Array<{ userId: string; score: number; nftCount: number }> = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const wallet of latestWallets) {
    try {
      const result = await calculateScore(wallet.user_id, wallet.address);
      await persistScore(wallet.user_id, wallet.address, result, { recalculateRank: false });
      refreshed.push({
        userId: wallet.user_id,
        score: result.score,
        nftCount: result.nftCount
      });
    } catch (error) {
      failed.push({
        userId: wallet.user_id,
        error: error instanceof Error ? error.message : "Unknown refresh error"
      });
    }
  }

  if (refreshed.length > 0) {
    await recalculateRanks();
  }

  return NextResponse.json({
    ok: true,
    checked: latestWallets.length,
    refreshed: refreshed.length,
    failed: failed.length,
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

function getLatestWalletsByUser(wallets: WalletRow[]) {
  const latestWallets = new Map<string, WalletRow>();

  for (const wallet of wallets) {
    if (!latestWallets.has(wallet.user_id)) {
      latestWallets.set(wallet.user_id, wallet);
    }
  }

  return [...latestWallets.values()];
}
