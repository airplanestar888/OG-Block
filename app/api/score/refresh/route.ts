import { NextRequest, NextResponse } from "next/server";
import { calculateScore, persistScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `${user.id}:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(key, 3, 60_000)) {
    return NextResponse.json({ error: "Too many refreshes. Try again shortly." }, { status: 429 });
  }

  const supabase = getSupabaseAdmin();
  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", user.id)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!wallet?.address) return NextResponse.json({ error: "Connect a verified wallet first" }, { status: 400 });

  const result = await calculateScore(user.id, wallet.address);
  await persistScore(user.id, wallet.address, result);

  return NextResponse.json({
    score: result.score,
    isOg: result.isOg,
    nftCount: result.nftCount
  });
}
