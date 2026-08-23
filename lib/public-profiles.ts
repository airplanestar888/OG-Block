import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getNftProvider } from "@/lib/nft/providers";
import type { PublicLeaderboardProfile, PublicScoreProfile } from "@/lib/types";
import { shortAddress } from "@/lib/address";
import { scoreRules } from "@/lib/config/score-rules";

function metadataHasRareTrait(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const attributes = (metadata as { attributes?: unknown }).attributes;
  if (!Array.isArray(attributes)) return false;
  return attributes.some((attribute) => {
    if (!attribute || typeof attribute !== "object") return false;
    const trait = attribute as { trait_type?: unknown; value?: unknown };
    return scoreRules.rareTraits.some(
      (rare) => trait.trait_type === rare.trait_type && trait.value === rare.value
    );
  });
}

type LeaderboardRow = {
  user_id?: string;
  rank: number | null;
  score: number;
  nft_count: number;
  last_calculated_at: string | null;
  users: {
    id?: string;
    x_handle: string;
    x_name: string | null;
    x_avatar: string | null;
    profile_role: "human" | "agent";
  } | null;
};

type RawHistoryRow = {
  id: string;
  user_id: string;
  old_score: number;
  new_score: number;
  points_delta: number;
  old_nft_count: number;
  new_nft_count: number;
  nft_delta: number;
  old_rank: number | null;
  new_rank: number | null;
  event_type: "initial_score" | "nft_added" | "nft_removed" | "score_updated" | "wallet_connected" | "wallet_disconnected";
  reason: string | null;
  created_at: string;
  users: {
    x_handle: string;
    x_name: string | null;
    x_avatar: string | null;
    profile_role: "human" | "agent";
  } | null;
};

const AGENT_IDENTITY_CONTRACT = "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";

async function getAgentIdentity(agentWalletAddress?: string | null) {
  if (!agentWalletAddress) return { hasAgentIdentity: false, agentIdentityTokenId: null };

  try {
    const holdings = await getNftProvider().getHoldings(agentWalletAddress, AGENT_IDENTITY_CONTRACT);
    const identity = holdings[0];
    return {
      hasAgentIdentity: Boolean(identity),
      agentIdentityTokenId: identity?.tokenId || null
    };
  } catch {
    return { hasAgentIdentity: false, agentIdentityTokenId: null };
  }
}

export async function getPublicProfileByHandle(handle: string): Promise<PublicScoreProfile | null> {
  const supabase = getSupabaseAdmin();
  const normalizedHandle = handle.replace(/^@/, "").toLowerCase();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,x_handle,x_name,x_avatar,profile_role")
    .eq("x_handle", normalizedHandle)
    .maybeSingle();

  if (userError) throw userError;
  if (!user) return null;

  const [{ data: wallets, error: walletError }, { data: score, error: scoreError }, { data: holdings, error: holdingsError }, { data: ogClaim, error: ogClaimError }] = await Promise.all([
    supabase
      .from("wallets")
      .select("address,wallet_slot")
      .eq("user_id", user.id)
      .in("wallet_slot", ["human", "agent"]),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("nft_holdings")
      .select("token_id,metadata_json")
      .eq("user_id", user.id),
    supabase
      .from("og_card_claims")
      .select("tier")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
  ]);

  if (walletError) throw walletError;
  if (scoreError) throw scoreError;
  if (holdingsError) throw holdingsError;
  if (ogClaimError) throw ogClaimError;

  // Verified breakdown from the same on-chain holdings the score is built from.
  let rareCount = 0;
  let earlyCount = 0;
  for (const holding of holdings || []) {
    if (metadataHasRareTrait(holding.metadata_json)) rareCount += 1;
    const tokenId = Number(holding.token_id);
    if (Number.isFinite(tokenId) && tokenId < scoreRules.earlyTokenThreshold) earlyCount += 1;
  }

  const humanWallet = (wallets || []).find((wallet) => wallet.wallet_slot === "human");
  const agentWallet = (wallets || []).find((wallet) => wallet.wallet_slot === "agent");
  const agentIdentity = await getAgentIdentity(agentWallet?.address);

  return {
    xHandle: user.x_handle,
    xName: user.x_name,
    xAvatar: user.x_avatar,
    profileRole: user.profile_role || "human",
    walletAddress: shortAddress(humanWallet?.address || agentWallet?.address || null),
    humanWalletAddress: shortAddress(humanWallet?.address || null),
    agentWalletAddress: shortAddress(agentWallet?.address || null),
    score: score?.score || 0,
    rank: score?.rank || null,
    isOg: Boolean(score?.is_og),
    nftCount: score?.nft_count || 0,
    rareCount,
    earlyCount,
    tier: ogClaim?.tier || null,
    hasAgentIdentity: agentIdentity.hasAgentIdentity,
    agentIdentityTokenId: agentIdentity.agentIdentityTokenId,
    lastCalculatedAt: score?.last_calculated_at || null
  };
}

export async function getLeaderboard(limit = 100): Promise<PublicLeaderboardProfile[]> {
  const supabase = getSupabaseAdmin();
  const [{ data, error }, historyRes, claimsRes] = await Promise.all([
    supabase
      .from("scores")
      .select("user_id,rank,score,nft_count,last_calculated_at,users(id,x_handle,x_name,x_avatar,profile_role)")
      .order("score", { ascending: false })
      .order("rank", { ascending: true })
      .limit(limit),
    supabase
      .from("score_history")
      .select("user_id,points_delta,nft_delta,event_type,created_at")
      .order("created_at", { ascending: false })
      .limit(limit * 3)
      .then(
        (res) => res,
        () => ({ data: null })
      ),
    supabase
      .from("og_card_claims")
      .select("user_id")
      .then(
        (res) => res,
        () => ({ data: null })
      )
  ]);

  if (error) throw error;

  // Count OG Card badges per user (any claim = 1+ badge).
  const badgeCountByUser = new Map<string, number>();
  if (claimsRes?.data) {
    for (const claim of claimsRes.data as Array<{ user_id: string }>) {
      if (!claim.user_id) continue;
      badgeCountByUser.set(claim.user_id, (badgeCountByUser.get(claim.user_id) || 0) + 1);
    }
  }

  const latestHistoryByUser = new Map<
    string,
    {
      points_delta: number;
      nft_delta: number;
      event_type: "initial_score" | "nft_added" | "nft_removed" | "score_updated" | "wallet_connected" | "wallet_disconnected";
      created_at: string;
    }
  >();

  if (historyRes?.data) {
    for (const entry of historyRes.data) {
      if (!latestHistoryByUser.has(entry.user_id)) {
        latestHistoryByUser.set(entry.user_id, entry);
      }
    }
  }

  const rows = (data || []) as unknown as LeaderboardRow[];
  return rows.map((row) => {
    const history = row.user_id ? latestHistoryByUser.get(row.user_id) : undefined;
    // For an admin rescore that rebuilt holdings, the history delta can be
    // inflated (e.g. +16125 when the score was already ~16000). Hide the
    // badge when it would just repeat the score itself.
    let pointsDelta: number | undefined =
      history !== undefined ? history.points_delta : row.score > 0 ? row.score : undefined;
    if (pointsDelta !== undefined && Math.abs(pointsDelta) === row.score && history?.event_type === "nft_added") {
      pointsDelta = undefined;
    }
    const nftDelta = history !== undefined ? history.nft_delta : (row.nft_count > 0 ? row.nft_count : undefined);

    return {
      userId: row.user_id,
      xHandle: row.users?.x_handle || "",
      xName: row.users?.x_name || null,
      xAvatar: row.users?.x_avatar || null,
      profileRole: row.users?.profile_role || "human",
      score: row.score,
      rank: row.rank,
      nftCount: row.nft_count,
      badgeCount: row.user_id ? badgeCountByUser.get(row.user_id) || 0 : 0,
      lastCalculatedAt: row.last_calculated_at,
      recentPointsDelta: pointsDelta,
      recentNftDelta: nftDelta,
      recentEventType: history?.event_type || (row.score > 0 ? "initial_score" : undefined),
      recentActivityAt: history?.created_at || row.last_calculated_at
    };
  });
}


export async function getLeaderboardHistory(limit = 50): Promise<import("@/lib/types").ScoreHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("score_history")
    .select(`
      id,
      user_id,
      old_score,
      new_score,
      points_delta,
      old_nft_count,
      new_nft_count,
      nft_delta,
      old_rank,
      new_rank,
      event_type,
      reason,
      created_at,
      users (
        x_handle,
        x_name,
        x_avatar,
        profile_role
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  const rows = (data || []) as unknown as RawHistoryRow[];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    xHandle: row.users?.x_handle || "",
    xName: row.users?.x_name || null,
    xAvatar: row.users?.x_avatar || null,
    profileRole: row.users?.profile_role || "human",
    oldScore: row.old_score,
    newScore: row.new_score,
    pointsDelta: row.points_delta,
    oldNftCount: row.old_nft_count,
    newNftCount: row.new_nft_count,
    nftDelta: row.nft_delta,
    oldRank: row.old_rank,
    newRank: row.new_rank,
    eventType: row.event_type,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

export async function getUserScoreHistory(userId: string, limit = 20): Promise<import("@/lib/types").ScoreHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("score_history")
    .select(`
      id,
      user_id,
      old_score,
      new_score,
      points_delta,
      old_nft_count,
      new_nft_count,
      nft_delta,
      old_rank,
      new_rank,
      event_type,
      reason,
      created_at,
      users (
        x_handle,
        x_name,
        x_avatar,
        profile_role
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  const rows = (data || []) as unknown as RawHistoryRow[];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    xHandle: row.users?.x_handle || "",
    xName: row.users?.x_name || null,
    xAvatar: row.users?.x_avatar || null,
    profileRole: row.users?.profile_role || "human",
    oldScore: row.old_score,
    newScore: row.new_score,
    pointsDelta: row.points_delta,
    oldNftCount: row.old_nft_count,
    newNftCount: row.new_nft_count,
    nftDelta: row.nft_delta,
    oldRank: row.old_rank,
    newRank: row.new_rank,
    eventType: row.event_type,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

