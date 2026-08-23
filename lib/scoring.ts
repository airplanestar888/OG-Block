import { scoreRules } from "@/lib/config/score-rules";
import { getNftProvider } from "@/lib/nft/providers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { registerWalletContracts, contractCounts, isCounted, type ContractRecord } from "@/lib/nft/contracts";
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/// Fetch one wallet's holdings, following the provider's indexing flow.
/// A wallet that was just verified may not be indexed yet, so we retry a few
/// times with a delay instead of trusting a premature empty/failed result.
/// If it still fails after retries, we THROW — the caller must not persist a
/// partial/undercounted score.
async function fetchWalletHoldings(
  provider: ReturnType<typeof getNftProvider>,
  walletAddress: string,
  options: { retryOnEmpty: boolean }
): Promise<NftHolding[]> {
  const maxAttempts = 3;
  const delayMs = 5000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const holdings = await provider.getHoldings(walletAddress, scoreRules.targetCollection);
      // Empty right after verification usually means the wallet isn't indexed
      // yet — give the infra time and retry before accepting zero.
      if (holdings.length === 0 && options.retryOnEmpty && attempt < maxAttempts) {
        await sleep(delayMs);
        continue;
      }
      return holdings;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
        continue;
      }
    }
  }

  throw new Error(
    `NFT provider failed for wallet ${walletAddress} after ${maxAttempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function calculateFromHoldings(
  holdings: NftHolding[],
  isOg: boolean,
  registry?: Map<string, ContractRecord>
): ScoreResult {
  const allHoldings = holdings;
  // When the contract registry is available, drop NFTs from contracts that
  // don't count (verified overrides spam — a verified contract always counts).
  const valid = registry
    ? holdings.filter((h) => {
        const c = registry.get(h.contractAddress.toLowerCase());
        if (!c) return true; // not in registry (e.g. fallback path) → keep
        return isCounted(c);
      })
    : holdings;

  const nftCount = valid.length;
  let score = nftCount > 0 ? scoreRules.points.holdsProjectNft : 0;
  score += Math.max(0, nftCount - 1) * scoreRules.points.eachAdditionalNft;

  for (const holding of valid) {
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
    holdings: valid,
    allHoldings
  };
}

export async function calculateScore(userId: string, walletAddress: string): Promise<ScoreResult> {
  return calculateScoreForWallets(userId, [walletAddress]);
}

export async function calculateScoreForWallets(
  userId: string,
  walletAddresses: string[],
  options: { retryOnEmpty?: boolean } = {}
): Promise<ScoreResult> {
  const supabase = getSupabaseAdmin();
  const provider = getNftProvider();
  const normalizedWallets = [...new Set(walletAddresses.map((address) => address.toLowerCase()))];
  const holdingsByKey = new Map<string, NftHolding>();
  const allContracts: ContractRecord[] = [];
  const seenContract = new Set<string>();

  // Phase 1 — register each wallet's contracts into the registry (one cheap
  // Alchemy getContractsForOwner call per wallet). Contracts are evaluated once
  // globally and reused across wallets, so repeat scans cost almost nothing.
  for (const walletAddress of normalizedWallets) {
    const contracts = await registerWalletContracts(walletAddress);
    for (const c of contracts) {
      if (!seenContract.has(c.contract_address)) {
        seenContract.add(c.contract_address);
        allContracts.push(c);
      }
    }
  }

  // Phase 2 — fetch full holdings only for scoring metadata (rare traits, early
  // token IDs). If ANY wallet fails after retries, we throw — never persist a
  // partial score that silently drops a wallet's NFTs.
  for (const walletAddress of normalizedWallets) {
    const holdings = await fetchWalletHoldings(provider, walletAddress, {
      retryOnEmpty: options.retryOnEmpty ?? false
    });
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

  const result = calculateFromHoldings(
    [...holdingsByKey.values()],
    Boolean(allowlist?.length),
    seenContract.size > 0 ? new Map(allContracts.map((c) => [c.contract_address, c])) : undefined
  );
  result.contractBreakdown = contractCounts(allContracts);
  return result;
}

export async function persistScore(
  userId: string,
  result: ScoreResult,
  options: { recalculateRank?: boolean; forceHistory?: boolean } = {}
) {
  const supabase = getSupabaseAdmin();
  const shouldRecalculateRank = options.recalculateRank ?? true;

  // Retrieve current score before update to calculate deltas
  const { data: currentScore } = await supabase
    .from("scores")
    .select("score,nft_count,rank")
    .eq("user_id", userId)
    .maybeSingle();

  const oldScore = currentScore?.score ?? 0;
  const oldNftCount = currentScore?.nft_count ?? 0;
  const oldRank = currentScore?.rank ?? null;
  const pointsDelta = result.score - oldScore;
  const nftDelta = result.nftCount - oldNftCount;

  const allToStore = result.allHoldings ?? result.holdings;
  await supabase.from("nft_holdings").delete().eq("user_id", userId);

  if (allToStore.length > 0) {
    const { error: holdingsError } = await supabase.from("nft_holdings").insert(
      allToStore.map((holding) => ({
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

  let newRank: number | null = null;
  if (shouldRecalculateRank) {
    await recalculateRanks();
    const { data: updatedScore } = await supabase
      .from("scores")
      .select("rank")
      .eq("user_id", userId)
      .maybeSingle();
    newRank = updatedScore?.rank ?? null;
  }

  // Record history entry if score or NFT count changed, or if it's the initial score
  const isInitial = !currentScore && (result.score > 0 || result.nftCount > 0);
  const hasChanged = pointsDelta !== 0 || nftDelta !== 0;

  if (isInitial || hasChanged || options.forceHistory) {
    let eventType: "initial_score" | "nft_added" | "nft_removed" | "score_updated" = "score_updated";
    let reason = "Score recalculated";

    if (isInitial) {
      eventType = "initial_score";
      reason = result.nftCount > 0
        ? `Initial score: +${result.score} pts (${result.nftCount} NFT${result.nftCount > 1 ? "s" : ""})`
        : `Initial profile verified (+${result.score} pts)`;
    } else if (nftDelta > 0) {
      eventType = "nft_added";
      reason = `Added ${nftDelta} NFT${nftDelta > 1 ? "s" : ""} (+${pointsDelta} pts)`;
    } else if (nftDelta < 0) {
      eventType = "nft_removed";
      reason = `Transferred ${Math.abs(nftDelta)} NFT${Math.abs(nftDelta) > 1 ? "s" : ""} (${pointsDelta} pts)`;
    } else if (pointsDelta > 0) {
      eventType = "score_updated";
      reason = `Score boosted (+${pointsDelta} pts)`;
    } else if (pointsDelta < 0) {
      eventType = "score_updated";
      reason = `Score updated (${pointsDelta} pts)`;
    }

    try {
      await supabase.from("score_history").insert({
        user_id: userId,
        old_score: oldScore,
        new_score: result.score,
        points_delta: pointsDelta,
        old_nft_count: oldNftCount,
        new_nft_count: result.nftCount,
        nft_delta: nftDelta,
        old_rank: oldRank,
        new_rank: newRank,
        event_type: eventType,
        reason,
        metadata_json: {
          holdingsCount: result.holdings.length,
          isOg: result.isOg
        },
        created_at: new Date().toISOString()
      });
    } catch {
      // Allow scoring flow to succeed even if history table is temporarily offline
    }
  }
}

export async function resetScore(userId: string, options: { recalculateRank?: boolean } = {}) {
  const supabase = getSupabaseAdmin();
  const shouldRecalculateRank = options.recalculateRank ?? true;

  const { data: currentScore } = await supabase
    .from("scores")
    .select("score,nft_count,rank")
    .eq("user_id", userId)
    .maybeSingle();

  await supabase.from("nft_holdings").delete().eq("user_id", userId);

  const { error: scoreError } = await supabase.from("scores").upsert(
    {
      user_id: userId,
      score: 0,
      is_og: false,
      nft_count: 0,
      last_calculated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
  if (scoreError) throw scoreError;

  if (shouldRecalculateRank) {
    await recalculateRanks();
  }

  if (currentScore && (currentScore.score > 0 || currentScore.nft_count > 0)) {
    try {
      await supabase.from("score_history").insert({
        user_id: userId,
        old_score: currentScore.score,
        new_score: 0,
        points_delta: -currentScore.score,
        old_nft_count: currentScore.nft_count,
        new_nft_count: 0,
        nft_delta: -currentScore.nft_count,
        old_rank: currentScore.rank,
        new_rank: null,
        event_type: "wallet_disconnected",
        reason: `Wallet disconnected (-${currentScore.score} pts)`,
        metadata_json: {},
        created_at: new Date().toISOString()
      });
    } catch {
      // Allow reset flow to succeed
    }
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

