import { scoreRules } from "@/lib/config/score-rules";
import { getNftProvider } from "@/lib/nft/providers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { NftHolding, ScoreResult } from "@/lib/types";

function hasRareTrait(holding: NftHolding) {
  const attributes = holding.metadata.attributes;
  if (!Array.isArray(attributes)) return false;

  return attributes.some((attribute) => {
    if (!attribute || typeof attribute !== "object") return false;
    const trait = attribute as { trait_type?: unknown; value?: unknown };
    return scoreRules.rareTraits.some(
      (rare) => trait.trait_type === rare.trait_type && trait.value === rare.value
    );
  });
}

export async function calculateScore(userId: string, walletAddress: string): Promise<ScoreResult> {
  const supabase = getSupabaseAdmin();
  const provider = getNftProvider();
  const holdings = await provider.getHoldings(walletAddress, scoreRules.targetCollection);
  const nftCount = holdings.length;

  let score = nftCount > 0 ? scoreRules.points.holdsProjectNft : 0;
  score += Math.max(0, nftCount - 1) * scoreRules.points.eachAdditionalNft;

  for (const holding of holdings) {
    if (hasRareTrait(holding)) score += scoreRules.points.rareTrait;
    const tokenId = Number(holding.tokenId);
    if (Number.isFinite(tokenId) && tokenId < scoreRules.earlyTokenThreshold) {
      score += scoreRules.points.earlyTokenId;
    }
  }

  const { data: allowlist, error: allowlistError } = await supabase
    .from("og_allowlist")
    .select("id")
    .eq("wallet_address", walletAddress.toLowerCase())
    .maybeSingle();

  if (allowlistError) throw allowlistError;

  return {
    score,
    isOg: Boolean(allowlist),
    nftCount,
    holdings
  };
}

export async function persistScore(userId: string, walletAddress: string, result: ScoreResult) {
  const supabase = getSupabaseAdmin();

  await supabase.from("nft_holdings").delete().eq("user_id", userId);

  if (result.holdings.length > 0) {
    const { error: holdingsError } = await supabase.from("nft_holdings").insert(
      result.holdings.map((holding) => ({
        user_id: userId,
        contract_address: holding.contractAddress.toLowerCase(),
        token_id: holding.tokenId,
        metadata_json: holding.metadata
      }))
    );
    if (holdingsError) throw holdingsError;
  }

  const { error: scoreError } = await supabase.from("scores").upsert(
    {
      user_id: userId,
      score: result.score,
      is_og: result.isOg,
      nft_count: result.nftCount,
      last_calculated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
  if (scoreError) throw scoreError;

  await recalculateRanks();
}

export async function recalculateRanks() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("id,score")
    .order("score", { ascending: false })
    .order("last_calculated_at", { ascending: true });

  if (error) throw error;
  if (!data) return;

  for (let index = 0; index < data.length; index += 1) {
    const { error: updateError } = await supabase
      .from("scores")
      .update({ rank: index + 1 })
      .eq("id", data[index].id);
    if (updateError) throw updateError;
  }
}
