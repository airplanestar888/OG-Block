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

function getHoldingKey(holding: NftHolding) {
  return `${holding.contractAddress.toLowerCase()}:${holding.tokenId}`;
}

function calculateFromHoldings(holdings: NftHolding[], isOg: boolean): ScoreResult {
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

  return {
    score,
    isOg,
    nftCount,
    holdings
  };
}

export async function calculateScore(userId: string, walletAddress: string): Promise<ScoreResult> {
  return calculateScoreForWallets(userId, [walletAddress]);
}

export async function calculateScoreForWallets(userId: string, walletAddresses: string[]): Promise<ScoreResult> {
  const supabase = getSupabaseAdmin();
  const provider = getNftProvider();
  const normalizedWallets = [...new Set(walletAddresses.map((address) => address.toLowerCase()))];
  const holdingsByKey = new Map<string, NftHolding>();

  for (const walletAddress of normalizedWallets) {
    const holdings = await provider.getHoldings(walletAddress, scoreRules.targetCollection);
    for (const holding of holdings) {
      holdingsByKey.set(getHoldingKey(holding), holding);
    }
  }

  const { data: allowlist, error: allowlistError } = await supabase
    .from("og_allowlist")
    .select("id")
    .in("wallet_address", normalizedWallets)
    .limit(1);

  if (allowlistError) throw allowlistError;

  return calculateFromHoldings([...holdingsByKey.values()], Boolean(allowlist?.length));
}

export async function persistScore(
  userId: string,
  result: ScoreResult,
  options: { recalculateRank?: boolean } = {}
) {
  const supabase = getSupabaseAdmin();
  const shouldRecalculateRank = options.recalculateRank ?? true;

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

  if (shouldRecalculateRank) {
    await recalculateRanks();
  }
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
