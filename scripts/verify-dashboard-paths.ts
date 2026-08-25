/**
 * Verify display-path fixes: simulate the dashboard's countedHoldings
 * computation and the public profile breakdown for a handle.
 * Usage: tsx scripts/verify-dashboard-paths.ts [@handle]
 */
import "dotenv/config";
import { fetchAllUserHoldings } from "@/lib/holdings";
import { getContractRecords } from "@/lib/nft/contracts";
import { isCounted } from "@/lib/nft/contracts";
import { getPublicProfileByHandle } from "@/lib/public-profiles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function main() {
  const handle = (process.argv[2] || "@bihary41418").replace(/^@/, "").toLowerCase();
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase.from("users").select("id").eq("x_handle", handle).maybeSingle();
  if (!user) throw new Error("user not found");

  // Dashboard path
  const holdings = await fetchAllUserHoldings(user.id);
  const addrs = [...new Set(holdings.map((h) => h.contract_address.toLowerCase()))];
  const contracts = await getContractRecords(addrs);
  const map = new Map(contracts.map((c) => [c.contract_address.toLowerCase(), c]));
  const countedHoldings = holdings.filter((h) => {
    const c = map.get(h.contract_address.toLowerCase());
    return c ? c.is_verified === true : false;
  });
  console.log(`dashboard path @${handle}: holdings=${holdings.length}, uniqueContracts=${addrs.length}, countedItems=${countedHoldings.length}`);

  // Public profile path
  const profile = await getPublicProfileByHandle(handle);
  console.log(`public profile @${handle}: score=${profile?.score}, nftCount=${profile?.nftCount}, rare=${profile?.rareCount}, early=${profile?.earlyCount}`);
  console.log(`contractBreakdown=${JSON.stringify(profile?.contractBreakdown)}`);
}
main();
