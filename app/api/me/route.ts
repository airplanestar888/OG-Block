import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ data: wallet }, { data: score }, { data: holdings }] = await Promise.all([
    supabase
      .from("wallets")
      .select("address,chain_id,verified_at")
      .eq("user_id", user.id)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("nft_holdings")
      .select("contract_address,token_id,metadata_json,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
  ]);

  return NextResponse.json({
    user,
    wallet,
    score,
    holdings: holdings || []
  });
}
