import { NextRequest, NextResponse } from "next/server";
import { getPublicProfileByHandle } from "@/lib/public-profiles";

export async function GET(_request: NextRequest, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const profile = await getPublicProfileByHandle(handle);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return NextResponse.json(profile);
}
