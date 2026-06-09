export type PublicScoreProfile = {
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  walletAddress: string | null;
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
