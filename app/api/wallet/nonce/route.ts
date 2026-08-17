import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/// GET /api/wallet/nonce — generate a single-use nonce for wallet verification.
/// The client includes this nonce + timestamp in the message it signs.
/// The server consumes (deletes) the nonce after verifying the signature.
export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("wallet_nonces")
    .insert({ nonce, created_at: new Date().toISOString() });

  if (error) throw error;

  return NextResponse.json({ nonce, expiresAt });
}
