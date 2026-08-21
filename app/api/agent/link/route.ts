import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveAgentLinkCode, consumeAgentLinkCode } from "@/lib/agent-link";
import { calculateScoreForWallets, persistScore } from "@/lib/scoring";

// Retries in scoring can exceed the default function budget.
export const maxDuration = 60;

const schema = z.object({
  code: z.string().min(6),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int(),
  message: z.string().min(12),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

const MAX_SKEW_MS = 5 * 60 * 1000;

/// POST /api/agent/link — public, no OAuth.
/// An autonomous agent registers its own wallet into the agent slot of the
/// profile that owns `code`. Security: the code (not any typed handle) resolves
/// the target profile server-side; the signature proves the agent owns the
/// wallet; one wallet can only be an agent for a single profile.
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { code, address, chainId, message, signature } = parsed.data;

  if (chainId !== 8453) {
    return NextResponse.json({ error: "Only Base mainnet (8453) is supported" }, { status: 400 });
  }

  // Resolve code → operator profile (enforces single-use + expiry).
  const resolved = await resolveAgentLinkCode(code);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid, used, or expired code" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,x_handle,x_user_id")
    .eq("id", resolved.userId)
    .maybeSingle();
  if (userError) throw userError;
  if (!user) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const lowerAddress = address.toLowerCase();

  // Timestamp freshness (inside the signed message).
  const tsMatch = message.match(/Timestamp:\s*(.+)/);
  if (!tsMatch) {
    return NextResponse.json({ error: "Signed message must include a Timestamp" }, { status: 400 });
  }
  const signedAt = Date.parse(tsMatch[1].trim());
  if (isNaN(signedAt) || Math.abs(Date.now() - signedAt) > MAX_SKEW_MS) {
    return NextResponse.json({ error: "Signature expired or has an invalid timestamp" }, { status: 400 });
  }

  // Exact-line content checks (anti-padding). The agent must have signed the
  // code + its own wallet address.
  const hasLine = (label: string, value: string) =>
    message.split("\n").some((line) => line.trim() === `${label}: ${value}`);
  if (
    !message.split("\n").some((l) => l.trim() === "OG BLOCK agent link") ||
    !hasLine("Code", code) ||
    !hasLine("Agent wallet", address)
  ) {
    return NextResponse.json({ error: "Signed message does not match the required challenge" }, { status: 400 });
  }

  // Signature proves the agent controls this wallet.
  const verified = await verifyMessage({ address: address as `0x${string}`, message, signature: signature as `0x${string}` });
  if (!verified) {
    return NextResponse.json({ error: "Signature could not be verified" }, { status: 400 });
  }

  // One wallet = one profile: reject if this address is already an agent slot
  // for a DIFFERENT user.
  const { data: clash } = await supabase
    .from("wallets")
    .select("user_id")
    .eq("wallet_slot", "agent")
    .eq("address", lowerAddress)
    .maybeSingle();
  if (clash && clash.user_id !== user.id) {
    return NextResponse.json({ error: "This wallet is already registered as an agent for another profile" }, { status: 409 });
  }

  // Upsert the agent wallet slot.
  const { error: upsertError } = await supabase
    .from("wallets")
    .upsert(
      { user_id: user.id, address: lowerAddress, chain_id: chainId, wallet_slot: "agent", verified_at: new Date().toISOString() },
      { onConflict: "user_id,wallet_slot" }
    );
  if (upsertError) throw upsertError;

  await consumeAgentLinkCode(code);

  // Recompute combined score across human + agent wallets.
  let score: number | null = null;
  try {
    const { data: wallets } = await supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .in("wallet_slot", ["human", "agent"]);
    const addresses = (wallets || []).map((w) => w.address).filter(Boolean);
    if (addresses.length > 0) {
      const result = await calculateScoreForWallets(user.id, addresses, { retryOnEmpty: true });
      await persistScore(user.id, result);
      score = result.score;
    }
  } catch {
    // Score refresh is best-effort; linking already succeeded.
  }

  return NextResponse.json({
    ok: true,
    handle: user.x_handle,
    agentWallet: lowerAddress,
    score
  });
}
