import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const walletConnectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int(),
  walletSlot: z.enum(["human", "agent"]),
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

  const { address, chainId, walletSlot, message, signature } = payload.data;
  if (walletSlot !== "human") {
    return NextResponse.json({ error: "Agent wallet must be verified by the agent flow" }, { status: 400 });
  }

  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base mainnet is supported" }, { status: 400 });
  }

  if (
    !message.includes(user.x_user_id) ||
    !message.toLowerCase().includes(address.toLowerCase()) ||
    !message.includes(`Wallet slot: ${walletSlot}`)
  ) {
    return NextResponse.json({ error: "Signed message does not match this X account, wallet, and slot" }, { status: 400 });
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
        wallet_slot: walletSlot,
        verified_at: new Date().toISOString()
      },
      { onConflict: "user_id,wallet_slot" }
    )
    .select("address,chain_id,wallet_slot,verified_at")
    .single();

  if (error) throw error;
  return NextResponse.json({ wallet: data });
}
