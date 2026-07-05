import { NextRequest, NextResponse } from "next/server";
import { getPublicProfileByHandle } from "@/lib/public-profiles";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) return jsonWithCors({ error: "Profile not found" }, { status: 404 });
  return jsonWithCors(profile);
}
