/**
 * Cron-equivalent full rescore, run locally so it always uses THIS working
 * copy of the engine (the deployed cron may lag behind or cap at 50 users).
 * Mirrors /api/cron/refresh-scores: group wallets per user, calculate+persist
 * without per-user rerank, then recalculateRanks once at the end.
 *
 * Usage: tsx scripts/rescore-all.ts [limit]   (default: every user)
 */

import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateScoreForWallets, persistScore, recalculateRanks } from "@/lib/scoring";

type WalletRow = { user_id: string; address: string; wallet_slot: "human" | "agent" };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

async function main() {
  const limitArg = process.argv[2] ? Number(process.argv[2]) : Infinity;
  const supabase = getSupabaseAdmin();

  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("user_id,address,wallet_slot")
    .in("wallet_slot", ["human", "agent"])
    .order("verified_at", { ascending: false });
  if (error) throw error;

  // Same grouping as the cron route: first wallet per slot, one group per user.
  const groups = new Map<string, Map<string, WalletRow>>();
  for (const wallet of (wallets || []) as WalletRow[]) {
    const group = groups.get(wallet.user_id) || new Map<string, WalletRow>();
    if (!group.has(wallet.wallet_slot)) group.set(wallet.wallet_slot, wallet);
    groups.set(wallet.user_id, group);
  }
  const orderedGroups = [...groups.entries()].map(([userId, slots]) => ({
    userId,
    addresses: [...new Set([...slots.values()].map((slot) => slot.address))]
  }));
  const batch = orderedGroups.slice(0, Number.isFinite(limitArg) ? limitArg : orderedGroups.length);
  console.log(`Rescoring ${batch.length}/${orderedGroups.length} user(s) with the local (new) engine`);

  // Readable logs: resolve handles up front.
  const handleByUser = new Map<string, string>();
  for (const group of chunk(batch.map((b) => b.userId), 100)) {
    const { data: users } = await supabase.from("users").select("id,x_handle").in("id", group);
    for (const user of users || []) handleByUser.set(user.id, user.x_handle);
  }

  let index = 0;
  const refreshed: Array<{ userId: string; handle: string; before: number; after: number }> = [];
  const failed: Array<{ userId: string; error: string }> = [];

  for (const { userId, addresses } of batch) {
    index += 1;
    const handle = handleByUser.get(userId) || userId.slice(0, 8);
    try {
      const { data: before } = await supabase
        .from("scores")
        .select("score,nft_count")
        .eq("user_id", userId)
        .maybeSingle();
      const result = await calculateScoreForWallets(userId, addresses);
      await persistScore(userId, result, { recalculateRank: false });
      const oldScore = before?.score ?? 0;
      refreshed.push({ userId, handle, before: oldScore, after: result.score });
      const delta = result.score - oldScore;
      console.log(
        `[${index}/${batch.length}] @${handle}: ${oldScore} -> ${result.score} (${delta >= 0 ? "+" : ""}${delta}), nft=${before?.nft_count ?? 0} -> ${result.nftCount}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ userId, error: message });
      console.log(`[${index}/${batch.length}] @${handle}: FAILED — ${message}`);
    }
  }

  if (refreshed.length > 0) {
    console.log("Recalculating ranks...");
    await recalculateRanks();
  }

  console.log(`Done: ${refreshed.length} refreshed, ${failed.length} failed.`);
  if (failed.length > 0) {
    console.log("Failures:");
    for (const item of failed) console.log(`  @${handleByUser.get(item.userId) || item.userId}: ${item.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
