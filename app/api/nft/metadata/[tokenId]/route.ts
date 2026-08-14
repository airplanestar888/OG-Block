import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function tierForTokenId(id: number): string {
  if (id < 100) return "Genesis";
  if (id < 500) return "Early";
  return "Member";
}

/**
 * ERC-721 Token Metadata Endpoint
 *
 * GET /api/nft/metadata/:tokenId
 *
 * Provides standardized OpenSea and EVM-compliant metadata for OG Card NFTs.
 * Resolves holder profile, score, and tier dynamically from Supabase database.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: rawTokenId } = await params;
    const tokenId = Number(rawTokenId);

    if (isNaN(tokenId) || tokenId < 0 || tokenId >= 1000) {
      return NextResponse.json({ error: "Invalid token ID (must be 0 - 999)" }, { status: 400 });
    }

    const tier = tierForTokenId(tokenId);
    const origin = process.env.PUBLIC_APP_URL || "https://og-block.vercel.app";
    const imageUrl = `${origin}/api/og-card/image`;

    // Lookup claim record and holder info from Supabase
    let holderHandle: string | null = null;
    let holderScore: number | null = null;
    let holderRank: number | null = null;
    let mintedAtTimestamp: string | null = null;

    try {
      const supabase = getSupabaseAdmin();
      const { data: claimData } = await supabase
        .from("og_card_claims")
        .select("wallet_address, claimed_at, user_id")
        .eq("token_id", String(tokenId))
        .maybeSingle();

      if (claimData) {
        mintedAtTimestamp = claimData.claimed_at;
        if (claimData.user_id) {
          const [{ data: userData }, { data: scoreData }] = await Promise.all([
            supabase.from("users").select("x_handle").eq("id", claimData.user_id).maybeSingle(),
            supabase.from("scores").select("score, rank").eq("user_id", claimData.user_id).maybeSingle()
          ]);

          if (userData?.x_handle) holderHandle = `@${userData.x_handle}`;
          if (scoreData?.score !== undefined) holderScore = scoreData.score;
          if (scoreData?.rank !== undefined) holderRank = scoreData.rank;
        }
      }
    } catch {
      // Database query error fallback
    }

    const attributes: Array<{ trait_type: string; value: string | number; display_type?: string }> = [
      { trait_type: "OG Number", value: tokenId },
      { trait_type: "Tier", value: tier }
    ];

    if (holderHandle) {
      attributes.push({ trait_type: "Holder", value: holderHandle });
    }
    if (holderScore !== null) {
      attributes.push({ trait_type: "Culture Score", value: holderScore });
    }
    if (holderRank !== null) {
      attributes.push({ trait_type: "Rank", value: holderRank });
    }
    if (mintedAtTimestamp) {
      attributes.push({
        display_type: "date",
        trait_type: "Claimed At",
        value: Math.floor(new Date(mintedAtTimestamp).getTime() / 1000)
      });
    }

    const metadata = {
      name: `OG Card #${tokenId}`,
      description: "OG-Block OG Card - on-chain proof of early membership in the OG-Block culture network on Base.",
      image: imageUrl,
      external_url: `${origin}/og-card`,
      attributes
    };

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400"
      }
    });
  } catch (error) {
    console.error("Error generating NFT metadata:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
