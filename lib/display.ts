import { scoreRules } from "@/lib/config/score-rules";
import type { NftHolding } from "@/lib/types";

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

export function getHoldingScoreBreakdown(holding: NftHolding, index: number) {
  const parts: Array<{ label: string; points: number }> = [];

  if (index === 0) {
    parts.push({ label: "Membership NFT", points: scoreRules.points.holdsProjectNft });
  } else {
    parts.push({ label: "Additional NFT", points: scoreRules.points.eachAdditionalNft });
  }

  if (hasRareTrait(holding)) {
    parts.push({ label: "Rare trait", points: scoreRules.points.rareTrait });
  }

  const tokenId = Number(holding.tokenId);
  if (Number.isFinite(tokenId) && tokenId < scoreRules.earlyTokenThreshold) {
    parts.push({ label: `Token ID < ${scoreRules.earlyTokenThreshold}`, points: scoreRules.points.earlyTokenId });
  }

  return {
    parts,
    total: parts.reduce((sum, part) => sum + part.points, 0)
  };
}
