import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { PublicScoreProfile } from "@/lib/types";
import { shortAddress } from "@/lib/address";

type LeaderboardRow = {
  rank: number | null;
  score: number;
  is_og: boolean;
  nft_count: number;
  last_calculated_at: string | null;
  users: {
    x_handle: string;
    x_name: string | null;
    x_avatar: string | null;
  } | null;
};

export async function getPublicProfileByHandle(handle: string): Promise<PublicScoreProfile | null> {
  const supabase = getSupabaseAdmin();
  const normalizedHandle = handle.replace(/^@/, "").toLowerCase();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,x_handle,x_name,x_avatar")
    .eq("x_handle", normalizedHandle)
    .maybeSingle();

  if (userError) throw userError;
  if (!user) return null;

  const [{ data: wallet, error: walletError }, { data: score, error: scoreError }] = await Promise.all([
    supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (walletError) throw walletError;
  if (scoreError) throw scoreError;

  return {
    xHandle: user.x_handle,
    xName: user.x_name,
    xAvatar: user.x_avatar,
    walletAddress: shortAddress(wallet?.address || null),
    score: score?.score || 0,
    rank: score?.rank || null,
    isOg: Boolean(score?.is_og),
    nftCount: score?.nft_count || 0,
    lastCalculatedAt: score?.last_calculated_at || null
  };
}

export async function getLeaderboard(limit = 100): Promise<PublicScoreProfile[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("scores")
    .select("rank,score,is_og,nft_count,last_calculated_at,users(x_handle,x_name,x_avatar)")
    .order("score", { ascending: false })
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data || []) as unknown as LeaderboardRow[];
  const userIds = rows.map((row) => row.users?.x_handle).filter(Boolean) as string[];

  const profiles = await Promise.all(
    rows.map(async (row) => {
      const handle = row.users?.x_handle || "";
      const profile = handle ? await getPublicProfileByHandle(handle) : null;
      return profile || {
        xHandle: handle,
        xName: row.users?.x_name || null,
        xAvatar: row.users?.x_avatar || null,
        walletAddress: null,
        score: row.score,
        rank: row.rank,
        isOg: row.is_og,
        nftCount: row.nft_count,
        lastCalculatedAt: row.last_calculated_at
      };
    })
  );

  void userIds;
  return profiles;
}
