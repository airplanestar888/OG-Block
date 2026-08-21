import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateScoreForWallets, persistScore, recalculateRanks } from "@/lib/scoring";

// Refreshing every user hits the NFT provider several times each; give it room.
export const maxDuration = 300;

type WalletRow = { user_id: string; address: string; wallet_slot: "human" | "agent" };

export async function POST() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Heavy operation — cap to a couple of runs per minute per admin.
  if (!rateLimit(`admin-refresh-all:${user.id}`, 2, 60_000)) {
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

  let refreshed = 0;
  const failed: string[] = [];
  for (const [userId, addrs] of groups) {
    try {
      const result = await calculateScoreForWallets(userId, addrs);
      await persistScore(userId, result, { recalculateRank: false });
      refreshed += 1;
    } catch (err) {
      failed.push(userId);
      console.error(`admin refresh-all failed for ${userId}:`, err instanceof Error ? err.message : err);
    }
  }

  if (refreshed > 0) await recalculateRanks();

  return NextResponse.json({
    ok: true,
    total: groups.size,
    refreshed,
    failed: failed.length
  });
}
