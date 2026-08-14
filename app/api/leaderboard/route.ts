import { NextResponse } from "next/server";
import { getLeaderboard, getLeaderboardHistory } from "@/lib/public-profiles";

export async function GET() {
  const [leaderboard, history] = await Promise.all([
    getLeaderboard(),
    getLeaderboardHistory(30)
  ]);

  return NextResponse.json({
    leaderboard,
    history
  });
}

