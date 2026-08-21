import { NextRequest, NextResponse } from "next/server";
import { calculateScoreForWallets, persistScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";

// Retries (wallet indexing + BaseScan lookups) can push this past the default
// 10s function limit; give it room so a slow lookup doesn't get killed mid-run.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `${user.id}:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(key, 3, 60_000)) {
    return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", user.id)
    .in("wallet_slot", ["human", "agent"]);

  if (error) throw error;

  const walletAddresses = (wallets || []).map((wallet) => wallet.address).filter(Boolean);
  if (walletAddresses.length === 0) {
    return NextResponse.json({ error: "Connect a human or agent wallet first" }, { status: 400 });
  }

  const result = await calculateScoreForWallets(user.id, walletAddresses, { retryOnEmpty: true });
  await persistScore(user.id, result);

  const [{ data: updated }, { data: ogClaim }] = await Promise.all([
    supabase
      .from("scores")
      .select("rank")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("og_card_claims")
      .select("tier")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
  ]);

  return NextResponse.json({
    score: result.score,
    isOg: result.isOg,
    nftCount: result.nftCount,
    rank: updated?.rank ?? null,
    tier: ogClaim?.tier ?? null
  });
}
