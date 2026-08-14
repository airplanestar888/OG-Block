import { NextRequest, NextResponse } from "next/server";
import { getLeaderboardHistory } from "@/lib/public-profiles";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 100) : 50;

  const history = await getLeaderboardHistory(limit);

  return NextResponse.json(
    { history },
    {
      headers: corsHeaders
    }
  );
}
