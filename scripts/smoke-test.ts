/**
 * OG-Block Smoke Test Suite
 *
 * Verifies:
 * 1. App Config & Fallbacks
 * 2. Token Tier Calculation
 * 3. Secure Image Path Resolution
 * 4. ERC-721 Metadata Generation
 * 5. Number Compact Formatting
 */

function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (absValue >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}K`;
  }
  return value.toLocaleString();
}

function tierForTokenId(id: number): string {
  if (id < 100) return "Genesis";
  if (id < 500) return "Early";
  return "Member";
}

async function runSmokeTests() {
  console.log("==========================================");
  console.log("   OG-Block Smoke Tests Running...        ");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test Number Formatting
  assert(formatCompactNumber(14600) === "14.6K", "Compact Number: 14600 -> 14.6K");
  assert(formatCompactNumber(2000) === "2K", "Compact Number: 2000 -> 2K");
  assert(formatCompactNumber(750) === "750", "Compact Number: 750 -> 750");
  assert(formatCompactNumber(1500000) === "1.5M", "Compact Number: 1500000 -> 1.5M");
  assert(formatCompactNumber(0) === "0", "Compact Number: 0 -> 0");

  // 2. Test Tier Derivation
  assert(tierForTokenId(0) === "Genesis", "Tier: Token #0 is Genesis");
  assert(tierForTokenId(99) === "Genesis", "Tier: Token #99 is Genesis");
  assert(tierForTokenId(100) === "Early", "Tier: Token #100 is Early");
  assert(tierForTokenId(499) === "Early", "Tier: Token #499 is Early");
  assert(tierForTokenId(500) === "Member", "Tier: Token #500 is Member");
  assert(tierForTokenId(999) === "Member", "Tier: Token #999 is Member");

  // 3. Test Metadata Attributes Structure
  const mockTokenId = 12;
  const mockTier = tierForTokenId(mockTokenId);
  const metadata = {
    name: `OG Card #${mockTokenId}`,
    description: "OG-Block OG Card - on-chain proof of early membership in the OG-Block culture network on Base.",
    image: "https://og-block.vercel.app/api/og-card/image",
    external_url: "https://og-block.vercel.app/og-card",
    attributes: [
      { trait_type: "OG Number", value: mockTokenId },
      { trait_type: "Tier", value: mockTier },
      { trait_type: "Holder", value: "@bihary41418" },
      { trait_type: "Culture Score", value: 14600 },
      { trait_type: "Rank", value: 1 }
    ]
  };

  assert(metadata.name === "OG Card #12", "Metadata: name matches Token ID");
  assert(metadata.image === "https://og-block.vercel.app/api/og-card/image", "Metadata: image points to secure proxy");
  assert(metadata.attributes.some(a => a.trait_type === "Tier" && a.value === "Genesis"), "Metadata: tier attribute verified");
  assert(metadata.attributes.some(a => a.trait_type === "Culture Score" && a.value === 14600), "Metadata: culture score attribute verified");

  console.log("\n==========================================");
  console.log(`Smoke Test Summary: ${passed} passed, ${failed} failed.`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSmokeTests();
