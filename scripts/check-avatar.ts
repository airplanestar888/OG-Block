import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("users").select("x_handle,x_avatar,x_name").in("x_handle", ["bihary41418", "codeblocklabs", "xvader"]);
  for (const u of data || []) {
    console.log(`${u.x_handle}: avatar=${u.x_avatar ? u.x_avatar.slice(0, 90) : "NULL"}`);
  }
}
main();
