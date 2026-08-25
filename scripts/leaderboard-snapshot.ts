import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("scores")
    .select("rank,score,nft_count,users(x_handle)")
    .order("score", { ascending: false })
    .order("rank", { ascending: true })
    .limit(15);
  for (const row of data || []) {
    console.log(`#${row.rank} @${(row.users as { x_handle: string })?.x_handle}: ${row.score} pts, ${row.nft_count} NFT`);
  }
}
main();
