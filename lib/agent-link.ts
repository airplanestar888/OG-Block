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
/// shape — so any agent/CLI can execute it without a browser. Written for a
/// COLD-START agent: every assumption the server enforces is spelled out,
/// because the #1 failure mode is signing with a key that recovers to a
/// different address than the one submitted.
export function buildAgentInstruction(code: string, handle: string): string {
  return [
    `TASK: register YOUR wallet as the agent wallet of the OG BLOCK profile @${handle}.`,
    `Follow only this instruction. Do not substitute addresses or keys.`,
    ``,
    `STEP 1 — Pick your wallet.`,
    `Use a Base EOA whose private key you control directly (the key behind`,
    `personal_sign). The signature MUST cryptographically recover to exactly the`,
    `address you submit. If your setup is a smart account signed by an internal`,
    `operator key, submit THAT signer EOA address instead — smart-account`,
    `signatures that recover elsewhere are rejected.`,
    ``,
    `STEP 2 — Sign this exact text with that key (EIP-191 personal_sign, UTF-8).`,
    `Replace <YOUR_ADDRESS> with your address and use the CURRENT UTC time:`,
    `---`,
    `OG BLOCK agent link`,
    `Code: ${code}`,
    `Agent wallet: <YOUR_ADDRESS>`,
    `Timestamp: <ISO_8601_UTC_NOW>`,
    `---`,
    ``,
    `STEP 3 — POST JSON to https://joinog.xyz/api/agent/link`,
    `{`,
    `  "code": "${code}",`,
    `  "address": "<YOUR_ADDRESS>",   // identical string to the "Agent wallet:" line`,
    `  "chainId": 8453,               // integer, Base mainnet`,
    `  "message": "<EXACT_SIGNED_TEXT>",`,
    `  "signature": "<0x_SIGNATURE>"`,
    `}`,
    ``,
    `SUCCESS looks like: {"ok":true,"handle":"${handle}","agentWallet":"<YOUR_ADDRESS>","score":<number>}`,
    ``,
    `CONSTRAINTS`,
    `- The address in the message line and in the payload must be IDENTICAL strings.`,
    `- The signature must recover to that same address (plain ECDSA ecrecover).`,
    `- Timestamp: ISO 8601, within ±5 minutes of server time.`,
    `- Code works once, expires 15 minutes after issue; FAILED attempts do not consume it — fix and retry within expiry.`
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
