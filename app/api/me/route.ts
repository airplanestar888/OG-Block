import { NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllUserHoldings } from "@/lib/holdings";

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ data: wallets }, { data: score }, holdings] = await Promise.all([
    supabase
      .from("wallets")
      .select("address,chain_id,wallet_slot,verified_at")
      .eq("user_id", user.id)
      .in("wallet_slot", ["human", "agent"]),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchAllUserHoldings(user.id, "contract_address,token_id,metadata_json,updated_at")
  ]);

  return NextResponse.json({
    user,
    wallets: wallets || [],
    wallet: (wallets || []).find((wallet) => wallet.wallet_slot === "human") || (wallets || []).find((wallet) => wallet.wallet_slot === "agent") || null,
    score,
    holdings: holdings || []
  });
}
