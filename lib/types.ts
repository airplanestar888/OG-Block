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
  lastCalculatedAt: string | null;
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
