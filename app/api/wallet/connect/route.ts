import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const walletConnectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int(),
  message: z.string().min(12),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = walletConnectSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid wallet payload" }, { status: 400 });
  }

  const { address, chainId, message, signature } = payload.data;
  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base mainnet is supported" }, { status: 400 });
  }

  if (!message.includes(user.x_user_id) || !message.toLowerCase().includes(address.toLowerCase())) {
    return NextResponse.json({ error: "Signed message does not match this X account and wallet" }, { status: 400 });
  }

  const verified = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
  if (!verified) {
    return NextResponse.json({ error: "Wallet signature could not be verified" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wallets")
    .upsert(
      {
        user_id: user.id,
        address: address.toLowerCase(),
        chain_id: chainId,
        verified_at: new Date().toISOString()
      },
      { onConflict: "user_id,address" }
    )
    .select("address,chain_id,verified_at")
    .single();

  if (error) throw error;
  return NextResponse.json({ wallet: data });
}
