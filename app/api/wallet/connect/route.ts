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
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  nonce: z.string().min(16)
});

const MAX_SKEW_MS = 5 * 60 * 1000; // signature must be within 5 minutes

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = walletConnectSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid wallet payload" }, { status: 400 });
  }

  const { address, chainId, walletSlot, message, signature, nonce } = payload.data;
  if (walletSlot !== "human") {
    return NextResponse.json({ error: "Agent wallet must be verified by the agent flow" }, { status: 400 });
  }

  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base mainnet is supported" }, { status: 400 });
  }

  // Validate nonce: must exist in DB and be consumed atomically.
  const supabase = getSupabaseAdmin();

  // Delete the nonce — if it existed, this is the first use (anti-replay).
  const { data: deleted, error: deleteError } = await supabase
    .from("wallet_nonces")
    .delete()
    .eq("nonce", nonce)
    .select("nonce");

  if (deleteError) throw deleteError;
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 400 });
  }

  // Validate timestamp expiry inside the signed message.
  const tsMatch = message.match(/Timestamp:\s*(.+)/);
  if (!tsMatch) {
    return NextResponse.json({ error: "Signed message must include a timestamp" }, { status: 400 });
  }

  const signedAt = Date.parse(tsMatch[1].trim());
  if (isNaN(signedAt)) {
    return NextResponse.json({ error: "Invalid timestamp in message" }, { status: 400 });
  }

  const skew = Math.abs(Date.now() - signedAt);
  if (skew > MAX_SKEW_MS) {
    return NextResponse.json({ error: "Signature has expired" }, { status: 400 });
  }

  // Validate message contains the nonce (binds signature to this challenge).
  if (!message.includes(`Nonce: ${nonce}`)) {
    return NextResponse.json({ error: "Signed message must include the nonce" }, { status: 400 });
  }

  // Exact-content checks (not substring) to prevent message padding attacks.
  const requiredLine = (label: string, value: string) =>
    message.split("\n").some((line) => line.trim() === `${label}: ${value}`);

  if (
    !requiredLine("X user id", user.x_user_id) ||
    !requiredLine("Wallet", address) ||
    !requiredLine("Wallet slot", walletSlot)
  ) {
    return NextResponse.json({ error: "Signed message does not match this X account, wallet, and slot" }, { status: 400 });
  }

  const verified = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
  if (!verified) {
    return NextResponse.json({ error: "Wallet signature could not be verified" }, { status: 400 });
  }

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
