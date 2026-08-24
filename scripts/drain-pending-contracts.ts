/**
 * Drain pending nft_contracts backlog by running the engine's own evaluator
 * until the table is clean or the evaluation budget runs out.
 * Usage: tsx scripts/drain-pending-contracts.ts [maxEvaluations]
 */

import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { evaluatePendingContracts } from "@/lib/nft/contracts";

async function main() {
  const budget = Number(process.argv[2] || 300);
  const supabase = getSupabaseAdmin();

  const { count: before } = await supabase
    .from("nft_contracts")
    .select("contract_address", { count: "exact", head: true })
    .eq("status", "pending");
  console.log(`Pending contracts before: ${before}`);

  let done = 0;
  while (done < budget) {
    const batch = Math.min(50, budget - done);
    const evaluated = await evaluatePendingContracts(batch);
    done += evaluated;
    console.log(`evaluated ${evaluated} (total ${done})`);
    if (evaluated === 0) break;
  }

  const { count: after } = await supabase
    .from("nft_contracts")
    .select("contract_address", { count: "exact", head: true })
    .eq("status", "pending");
  console.log(`Pending contracts after: ${after} (evaluated ${done} this run)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
