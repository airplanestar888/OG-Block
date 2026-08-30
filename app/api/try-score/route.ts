import { NextRequest, NextResponse } from "next/server";
import { calculateScoreForWallets } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimitAsync } from "@/lib/rate-limit";
import { issueCaptchaChallenge, verifyCaptchaAnswer } from "@/lib/captcha";

// Anonymous "Try yours" preview: score any Base wallet without signing in.
// Nothing is persisted — persistScore is never called here, so the wallet
// does not join the leaderboard and no profile is created. Contract
// registration still runs (same pipeline as the dashboard) so preview
// numbers match what the owner would see after signing in.

// Retries (wallet indexing + BaseScan lookups) can run past the default
// function limit, same as /api/score/refresh.
export const maxDuration = 60;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const PREVIEW_USER_ID = "anonymous-preview";
const IP_LIMIT = 5;
const IP_WINDOW_MS = 10 * 60_000;

export async function GET() {
  return NextResponse.json(issueCaptchaChallenge());
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "local";
    if (!(await rateLimitAsync(`try-score:${ip}`, IP_LIMIT, IP_WINDOW_MS))) {
      return NextResponse.json(
        { error: "Too many previews from this network. Try again in about 10 minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
    const captchaAnswer = typeof body?.captchaAnswer === "string" ? body.captchaAnswer.trim() : "";

    if (!ADDRESS_PATTERN.test(address)) {
      return NextResponse.json(
        { error: "Enter a valid EVM wallet address (0x followed by 40 hex characters)." },
        { status: 400 }
      );
    }

    if (!verifyCaptchaAnswer(captchaToken, captchaAnswer)) {
      // Fail fast before any provider calls, and hand back a fresh challenge
      // so the client can retry without an extra round trip.
      return NextResponse.json(
        {
          error: "Captcha answer is wrong or expired — try the new question.",
          challenge: issueCaptchaChallenge()
        },
        { status: 400 }
      );
    }

    const lower = address.toLowerCase();
    // calculateScoreForWallets only touches userId inside persistScore/resetScore,
    // neither of which runs here — the placeholder id never reaches the database.
    const result = await calculateScoreForWallets(PREVIEW_USER_ID, [lower], { retryOnEmpty: true });

    // Would-be rank: where this score would land among persisted profiles.
    const supabase = getSupabaseAdmin();
    const { count } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .gt("score", result.score);

    return NextResponse.json({
      address: lower,
      score: result.score,
      nftCount: result.nftCount,
      isOg: result.isOg,
      tier: null,
      rank: typeof count === "number" ? count + 1 : null,
      previewRank: true,
      contractBreakdown: result.contractBreakdown ?? null
    });
  } catch (err) {
    console.error("try-score failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not score this wallet" },
      { status: 500 }
    );
  }
}
