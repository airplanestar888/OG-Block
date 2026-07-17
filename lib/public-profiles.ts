import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getNftProvider } from "@/lib/nft/providers";
import type { PublicLeaderboardProfile, PublicScoreProfile } from "@/lib/types";
import { shortAddress } from "@/lib/address";

type LeaderboardRow = {
  rank: number | null;
  score: number;
  nft_count: number;
  last_calculated_at: string | null;
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

  const [{ data: wallets, error: walletError }, { data: score, error: scoreError }] = await Promise.all([
    supabase
      .from("wallets")
      .select("address,wallet_slot")
      .eq("user_id", user.id)
      .in("wallet_slot", ["human", "agent"]),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (walletError) throw walletError;
  if (scoreError) throw scoreError;

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
    hasAgentIdentity: agentIdentity.hasAgentIdentity,
    agentIdentityTokenId: agentIdentity.agentIdentityTokenId,
    lastCalculatedAt: score?.last_calculated_at || null
  };
}

export async function getLeaderboard(limit = 100): Promise<PublicLeaderboardProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("rank,score,nft_count,last_calculated_at,users(x_handle,x_name,x_avatar,profile_role)")
    .order("score", { ascending: false })
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data || []) as unknown as LeaderboardRow[];
  return rows.map((row) => ({
    xHandle: row.users?.x_handle || "",
    xName: row.users?.x_name || null,
    xAvatar: row.users?.x_avatar || null,
    profileRole: row.users?.profile_role || "human",
    score: row.score,
    rank: row.rank,
    nftCount: row.nft_count,
    badgeCount: 0,
    lastCalculatedAt: row.last_calculated_at
  }));
}
