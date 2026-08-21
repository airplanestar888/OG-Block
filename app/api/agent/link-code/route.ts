import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCurrentUser } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";
import { createAgentLinkCode, buildAgentInstruction, AGENT_LINK_CODE_TTL_MS } from "@/lib/agent-link";

/// POST /api/agent/link-code
/// Operator (logged in) generates a one-time OTP-style code to hand to their
/// agent. The code binds server-side to this user's profile, so the agent can
/// only ever register into THIS profile's agent wallet slot.
export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `agent-link-code:${user.id}:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(key, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { code, expiresAt } = await createAgentLinkCode(user.id);
  const instruction = buildAgentInstruction(code, user.x_handle);

  return NextResponse.json({
    code,
    expiresAt,
    ttlMs: AGENT_LINK_CODE_TTL_MS,
    handle: user.x_handle,
    instruction
  });
}
