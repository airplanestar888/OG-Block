import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const AGENT_LINK_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Human-readable OTP-style code: OGB-XXXX-XXXX (no ambiguous chars).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function generateAgentCode(): string {
  return `OGB-${randomBlock(4)}-${randomBlock(4)}`;
}

/// Build the copy-paste instruction an operator hands to their agent. It is
/// self-contained: the code, the exact challenge message to sign, and the POST
/// shape — so any agent/CLI can execute it without a browser.
export function buildAgentInstruction(code: string, handle: string): string {
  return [
    `Register yourself as the agent wallet for the OG BLOCK profile @${handle}.`,
    ``,
    `1. Sign this exact message with your own agent wallet (Base):`,
    `   ---`,
    `   OG BLOCK agent link`,
    `   Code: ${code}`,
    `   Agent wallet: <YOUR_AGENT_WALLET_ADDRESS>`,
    `   Timestamp: <CURRENT_ISO_8601>`,
    `   ---`,
    `2. POST the result to https://joinog.xyz/api/agent/link`,
    `   Content-Type: application/json`,
    `   {`,
    `     "code": "${code}",`,
    `     "address": "<YOUR_AGENT_WALLET_ADDRESS>",`,
    `     "chainId": 8453,`,
    `     "message": "<THE_EXACT_MESSAGE_YOU_SIGNED>",`,
    `     "signature": "<0x_SIGNATURE>"`,
    `   }`,
    ``,
    `Rules: sign with your OWN wallet key only. Code expires in 15 minutes and works once.`
  ].join("\n");
}

/// Create a fresh single-use code for a user, clearing any prior unused ones.
export async function createAgentLinkCode(userId: string): Promise<{ code: string; expiresAt: number }> {
  const supabase = getSupabaseAdmin();
  // Drop this user's previous unused codes so only one is active at a time.
  await supabase.from("agent_link_codes").delete().eq("user_id", userId).is("used_at", null);

  const code = generateAgentCode();
  const expiresAtMs = Date.now() + AGENT_LINK_CODE_TTL_MS;
  const { error } = await supabase.from("agent_link_codes").insert({
    code,
    user_id: userId,
    expires_at: new Date(expiresAtMs).toISOString()
  });
  if (error) throw error;
  return { code, expiresAt: expiresAtMs };
}

/// Resolve a code to its owning user id, enforcing single-use + expiry.
/// Returns null if invalid/expired/used.
export async function resolveAgentLinkCode(code: string): Promise<{ userId: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("agent_link_codes")
    .select("code,user_id,expires_at,used_at")
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  if (data.used_at) return null;
  if (Date.parse(data.expires_at) < Date.now()) return null;
  return { userId: data.user_id };
}

/// Mark a code consumed (best-effort, after a successful link).
export async function consumeAgentLinkCode(code: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("agent_link_codes").update({ used_at: new Date().toISOString() }).eq("code", code);
}
