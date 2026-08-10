import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";

const claimSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenId: z.coerce.string().optional(),
  tier: z.string().max(32).optional(),
  chainId: z.coerce.number().int().positive().optional()
});

export async function POST(request: Request) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `og-claim:${user.id}:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(key, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const payload = claimSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid claim payload" }, { status: 400 });
  }

  const walletAddress = payload.data.walletAddress.toLowerCase();
  const { tokenId, tier, chainId } = payload.data;
  const supabase = getSupabaseAdmin();

  // check if this wallet already claimed
  const { data: existing } = await supabase
    .from("og_card_claims")
    .select("id,user_id,claimed_at,token_id,tier,chain_id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (existing) {
    if (existing.user_id === user.id) {
      // backfill token details if they weren't stored before
      if ((tokenId || tier || chainId) && (!existing.token_id || !existing.tier || !existing.chain_id)) {
        await supabase
          .from("og_card_claims")
          .update({
            token_id: existing.token_id ?? tokenId ?? null,
            tier: existing.tier ?? tier ?? null,
            chain_id: existing.chain_id ?? chainId ?? null
          })
          .eq("id", existing.id);
      }
      return NextResponse.json({ claim: existing, message: "Already claimed" });
    }
    return NextResponse.json({ error: "This wallet already claimed an OG Card" }, { status: 409 });
  }

  // insert claim
  const { data: claim, error } = await supabase
    .from("og_card_claims")
    .insert({
      user_id: user.id,
      wallet_address: walletAddress,
      token_id: tokenId ?? null,
      tier: tier ?? null,
      chain_id: chainId ?? null
    })
    .select("id,user_id,wallet_address,claimed_at,token_id,tier,chain_id")
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
    .select("id,wallet_address,claimed_at,token_id,tier,chain_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ claim: claim ?? null });
}
