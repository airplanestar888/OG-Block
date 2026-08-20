import type { ProfileRole } from "@/lib/users";

export type WalletSlot = "human" | "agent";

export type PublicScoreProfile = {
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  profileRole: ProfileRole;
  walletAddress: string | null;
  humanWalletAddress: string | null;
  agentWalletAddress: string | null;
  score: number;
  rank: number | null;
  isOg: boolean;
  nftCount: number;
  rareCount: number;
  earlyCount: number;
  tier: string | null;
  hasAgentIdentity: boolean;
  agentIdentityTokenId: string | null;
  lastCalculatedAt: string | null;
};

export type PublicLeaderboardProfile = {
  userId?: string;
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  profileRole: ProfileRole;
  score: number;
  rank: number | null;
  nftCount: number;
  badgeCount: number;
  lastCalculatedAt: string | null;
  recentPointsDelta?: number;
  recentNftDelta?: number;
  recentEventType?: ScoreHistoryEventType;
  recentActivityAt?: string | null;
};

export type ScoreHistoryEventType =
  | "initial_score"
  | "nft_added"
  | "nft_removed"
  | "score_updated"
  | "wallet_connected"
  | "wallet_disconnected";

export type ScoreHistoryEntry = {
  id: string;
  userId: string;
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  profileRole: ProfileRole;
  oldScore: number;
  newScore: number;
  pointsDelta: number;
  oldNftCount: number;
  newNftCount: number;
  nftDelta: number;
  oldRank: number | null;
  newRank: number | null;
  eventType: ScoreHistoryEventType;
  reason: string | null;
  createdAt: string;
};

export type NftHolding = {
  contractAddress: string;
  tokenId: string;
  metadata: Record<string, unknown>;
};

export type ScoreResult = {
  score: number;
  isOg: boolean;
  nftCount: number;
  holdings: NftHolding[];
};

