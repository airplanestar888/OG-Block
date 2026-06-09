import { env } from "@/lib/env";

export const scoreRules = {
  targetCollection: env.TARGET_NFT_CONTRACT_ADDRESS.toLowerCase(),
  scoreAllWalletNfts:
    !env.TARGET_NFT_CONTRACT_ADDRESS ||
    env.TARGET_NFT_CONTRACT_ADDRESS.toLowerCase() === "all" ||
    env.TARGET_NFT_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000",
  earlyTokenThreshold: 500,
  points: {
    holdsProjectNft: 100,
    eachAdditionalNft: 25,
    rareTrait: 50,
    earlyTokenId: 75
  },
  rareTraits: [
    { trait_type: "Background", value: "Based Blue" },
    { trait_type: "Status", value: "OG" },
    { trait_type: "Edition", value: "Genesis" }
  ]
};
