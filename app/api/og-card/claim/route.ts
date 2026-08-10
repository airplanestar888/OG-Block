import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const claimSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export async function POST(request: Request) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = claimSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const walletAddress = payload.data.walletAddress.toLowerCase();
  const supabase = getSupabaseAdmin();

  // check if this wallet already claimed
  const { data: existing } = await supabase
    .from("og_card_claims")
    .select("id,user_id,claimed_at")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (existing) {
    if (existing.user_id === user.id) {
      return NextResponse.json({
        claim: existing,
        message: "Already claimed"
      });
    }
    return NextResponse.json({ error: "This wallet already claimed an OG Card" }, { status: 409 });
  }

  // insert claim
  const { data: claim, error } = await supabase
    .from("og_card_claims")
    .insert({ user_id: user.id, wallet_address: walletAddress })
    .select("id,user_id,wallet_address,claimed_at")
    .single();

  if (error) throw error;
  return NextResponse.json({ claim });
}

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: claim } = await supabase
    .from("og_card_claims")
    .select("id,wallet_address,claimed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ claim: claim ?? null });
}
