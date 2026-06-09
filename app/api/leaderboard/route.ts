import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/public-profiles";

export async function GET() {
  return NextResponse.json({ leaderboard: await getLeaderboard() });
}
