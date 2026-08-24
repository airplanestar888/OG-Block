/**
 * Rescore one user through the exact production path (calculate + persist +
 * rerank) and print before/after. Mirrors /api/score/refresh without auth.
 * Usage: tsx scripts/rescore-user.ts <@handle|userId>
 */

import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateScoreForWallets, persistScore } from "@/lib/scoring";

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("Usage: tsx scripts/rescore-user.ts <@handle|userId>");
  const supabase = getSupabaseAdmin();

  const query = supabase.from("users").select("id,x_handle");
  const { data: user } = arg.startsWith("0x") || arg.includes("-")
    ? await query.eq("id", arg).maybeSingle()
    : await query.eq("x_handle", arg.replace(/^@/, "").toLowerCase()).maybeSingle();
  if (!user) throw new Error(`User not found: ${arg}`);

  const { data: scoreBefore } = await supabase
    .from("scores")
    .select("score,nft_count,rank")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log(
    `@${user.x_handle} BEFORE: score=${scoreBefore?.score}, nft_count=${scoreBefore?.nft_count}, rank=${scoreBefore?.rank}`
  );

  const { data: wallets } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", user.id)
    .in("wallet_slot", ["human", "agent"]);
  const addresses = (wallets || []).map((w) => w.address);
  if (addresses.length === 0) throw new Error("User has no human/agent wallet");

  const result = await calculateScoreForWallets(user.id, addresses, { retryOnEmpty: true });
  await persistScore(user.id, result);

  const { data: scoreAfter } = await supabase
    .from("scores")
    .select("score,nft_count,rank")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log(
    `@${user.x_handle} AFTER:  score=${scoreAfter?.score}, nft_count=${scoreAfter?.nft_count}, rank=${scoreAfter?.rank}`
  );
  console.log(`Breakdown: ${JSON.stringify(result.contractBreakdown ?? {})}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
