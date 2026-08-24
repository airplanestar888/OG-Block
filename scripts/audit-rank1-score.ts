/**
 * Score Audit — Rank #1 wallet (read-only)
 *
 * Recomputes the rank-1 user's score independently and compares it with what
 * the scoring engine persisted, in two layers:
 *
 *   Layer 1 — DB internal consistency: stored nft_holdings + nft_contracts
 *             registry must reproduce the stored score/nft_count.
 *   Layer 2 — Fresh on-chain truth: holdings re-fetched from Alchemy for every
 *             wallet of the user (human + agent), deduped like the engine does,
 *             filtered through the registry → expected score vs stored score.
 *
 * Never writes to the DB. Registry gaps (contracts missing/pending) are
 * reported as findings because they change what the next scan will produce.
 *
 * Usage: npm run tsx scripts/audit-rank1-score.ts   (or npx tsx ...)
 */

import "dotenv/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getNftProvider } from "@/lib/nft/providers";
import { isCounted } from "@/lib/nft/contracts";
import { scoreRules } from "@/lib/config/score-rules";
import type { NftHolding } from "@/lib/types";

type ScoreRow = {
  id: number;
  user_id: string;
  score: number;
  nft_count: number;
  rank: number | null;
  is_og: boolean;
  last_calculated_at: string | null;
};

type StoredHolding = {
  contract_address: string;
  token_id: string;
  metadata_json: unknown;
};

type ContractRow = {
  contract_address: string;
  name: string | null;
  is_spam: boolean | null;
  is_verified: boolean | null;
  status: string;
};

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string): boolean {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed += 1;
    return true;
  }
  console.log(`  [FAIL] ${label}`);
  failed += 1;
  return false;
}

function hasRareTrait(metadata: unknown): boolean {
  const attributes = (metadata as { attributes?: unknown })?.attributes;
  if (!Array.isArray(attributes)) return false;
  return attributes.some((attribute) => {
    if (!attribute || typeof attribute !== "object") return false;
    const trait = attribute as { trait_type?: unknown; value?: unknown };
    return scoreRules.rareTraits.some(
      (rare) => trait.trait_type === rare.trait_type && trait.value === rare.value
    );
  });
}

function isEarly(tokenId: string): boolean {
  const numeric = Number(tokenId);
  return Number.isFinite(numeric) && numeric < scoreRules.earlyTokenThreshold;
}

/** The engine's exact point math over a set of counted holdings. */
function pointsFor(countedHoldings: Array<{ tokenId: string; metadata: unknown }>): {
  total: number;
  rareCount: number;
  earlyCount: number;
} {
  const nftCount = countedHoldings.length;
  let total = nftCount > 0 ? scoreRules.points.holdsProjectNft : 0;
  total += Math.max(0, nftCount - 1) * scoreRules.points.eachAdditionalNft;

  let rareCount = 0;
  let earlyCount = 0;
  for (const holding of countedHoldings) {
    if (hasRareTrait(holding.metadata)) {
      rareCount += 1;
      total += scoreRules.points.rareTrait;
    }
    if (isEarly(holding.tokenId)) {
      earlyCount += 1;
      total += scoreRules.points.earlyTokenId;
    }
  }
  return { total, rareCount, earlyCount };
}

function shortAddress(address: string | null): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function holdingKey(contractAddress: string, tokenId: string) {
  return `${contractAddress.toLowerCase()}:${tokenId}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

/// nft_holdings defaults to a 1000-row server cap — page through everything.
async function fetchAllStoredHoldings(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const all: StoredHolding[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("nft_holdings")
      .select("contract_address,token_id,metadata_json")
      .eq("user_id", userId)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as StoredHolding[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/// PostgREST .in() dies ("fetch failed", data=null) past a few hundred values
/// — chunk every registry lookup and surface errors instead of swallowing.
async function fetchRegistryRows(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  columns: string,
  addresses: string[]
): Promise<ContractRow[]> {
  const rows: ContractRow[] = [];
  for (const batch of chunk(addresses, 100)) {
    const { data, error } = await supabase.from("nft_contracts").select(columns).in("contract_address", batch);
    if (error) throw error;
    rows.push(...((data || []) as ContractRow[]));
  }
  return rows;
}

async function main() {
  console.log("==========================================================");
  console.log("  Score Audit — Rank #1 wallet (read-only)");
  console.log("==========================================================");
  console.log(
    `Rules: first NFT +${scoreRules.points.holdsProjectNft}, each additional +${scoreRules.points.eachAdditionalNft}, ` +
      `rare trait +${scoreRules.points.rareTrait}, tokenId<${scoreRules.earlyTokenThreshold} +${scoreRules.points.earlyTokenId}; ` +
      `counted contracts = BaseScan-verified only`
  );

  const supabase = getSupabaseAdmin();

  // ---- Identify rank 1 exactly the way the leaderboard orders rows ----
  const { data: topRows, error: topError } = await supabase
    .from("scores")
    .select("id,user_id,score,nft_count,rank,is_og,last_calculated_at")
    .order("score", { ascending: false })
    .order("rank", { ascending: true })
    .limit(5);
  if (topError) throw topError;

  const top = (topRows || []) as ScoreRow[];
  if (top.length === 0) throw new Error("No scores in DB — nothing to audit.");
  const rank1 = top[0];

  const { data: userRow } = await supabase
    .from("users")
    .select("x_handle,x_name,profile_role")
    .eq("id", rank1.user_id)
    .maybeSingle();
  const handle = userRow?.x_handle || rank1.user_id;

  console.log(`\nRank #1: @${handle} (user_id=${rank1.user_id})`);
  console.log(
    `Stored: score=${rank1.score}, nft_count=${rank1.nft_count}, rank=${rank1.rank ?? "null"}, ` +
      `last_calculated_at=${rank1.last_calculated_at}`
  );
  check(rank1.rank === 1, "rank column is 1 for the top row");

  // Rank ordering integrity: nobody above, no ties ranked lower but ordered first
  check(top.every((row) => (row.rank ?? Infinity) >= (rank1.rank ?? 0)), "no other row outranks rank 1 in stored ranks");

  // ---- Wallets of this user (human + agent), same slots the engine scores ----
  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", rank1.user_id)
    .in("wallet_slot", ["human", "agent"]);
  if (walletsError) throw walletsError;
  const walletList = (wallets || []) as Array<{ address: string; wallet_slot: string }>;
  console.log(
    `Wallets: ${walletList.map((w) => `${w.wallet_slot}=${shortAddress(w.address)}`).join(", ") || "none"}`
  );
  check(walletList.length > 0, "user has at least one human/agent wallet");

  // ======================================================================
  // Layer 1 — DB internal consistency
  // ======================================================================
  console.log("\n--- Layer 1: stored holdings + registry vs stored score ---");

  const storedHoldings = await fetchAllStoredHoldings(supabase, rank1.user_id);

  const storedAddresses = [...new Set(storedHoldings.map((h) => h.contract_address.toLowerCase()))];
  const registryRows = await fetchRegistryRows(supabase, "contract_address,name,is_spam,is_verified,status", storedAddresses);
  const registry = new Map(registryRows.map((c) => [c.contract_address.toLowerCase(), c]));

  const countedStored = storedHoldings.filter((h) => {
    const c = registry.get(h.contract_address.toLowerCase());
    return c ? isCounted(c) : false;
  });

  console.log(
    `Stored holdings: ${storedHoldings.length} NFT(s) across ${storedAddresses.length} contract(s); ` +
      `registry says ${countedStored.length} counted`
  );

  const layer1 = pointsFor(
    countedStored.map((h) => ({ tokenId: h.token_id, metadata: h.metadata_json }))
  );
  console.log(
    `Recomputed from stored data: score=${layer1.total} ` +
      `(rare×${layer1.rareCount}, early×${layer1.earlyCount})`
  );
  check(layer1.total === rank1.score, `stored score ${rank1.score} matches recomputation ${layer1.total}`);
  check(
    countedStored.length === rank1.nft_count,
    `stored nft_count ${rank1.nft_count} matches counted stored holdings ${countedStored.length}`
  );

  // ======================================================================
  // Layer 2 — fresh on-chain holdings via the same provider the engine uses
  // ======================================================================
  console.log("\n--- Layer 2: fresh Alchemy holdings vs stored score ---");

  const provider = getNftProvider();
  const freshByKey = new Map<string, NftHolding>();
  for (const wallet of walletList) {
    try {
      const holdings = await provider.getHoldings(wallet.address, scoreRules.targetCollection);
      console.log(`Wallet ${wallet.wallet_slot} ${shortAddress(wallet.address)}: ${holdings.length} fresh holding(s)`);
      for (const holding of holdings) {
        freshByKey.set(holdingKey(holding.contractAddress, holding.tokenId), holding);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`Wallet ${wallet.wallet_slot} ${shortAddress(wallet.address)}: FETCH FAILED — ${message}`);
      failed += 1;
    }
  }

  // Registry coverage for freshly seen contracts. Missing/pending contracts are
  // excluded by the engine today but will flip the score on the next scan.
  const freshAddresses = [...new Set([...freshByKey.values()].map((h) => h.contractAddress.toLowerCase()))];
  const freshRegistryRows = await fetchRegistryRows(supabase, "contract_address,name,is_spam,is_verified,status", freshAddresses);
  const freshRegistry = new Map(
    [...registryRows, ...freshRegistryRows].map((c) => [c.contract_address.toLowerCase(), c])
  );

  type Bucket = "counted" | "spam" | "unverified" | "missing_registry" | "pending";
  const buckets = new Map<Bucket, NftHolding[]>([
    ["counted", []],
    ["spam", []],
    ["unverified", []],
    ["missing_registry", []],
    ["pending", []]
  ]);
  // Engine truth is isCounted() alone (verified → counted) — status='pending'
  // must NOT exclude a contract whose is_verified was already determined.
  for (const holding of freshByKey.values()) {
    const addr = holding.contractAddress.toLowerCase();
    const record = freshRegistry.get(addr);
    if (!record) buckets.get("missing_registry")!.push(holding);
    else if (isCounted(record)) buckets.get("counted")!.push(holding);
    else if (record.status === "pending") buckets.get("pending")!.push(holding);
    else if (record.is_spam === true) buckets.get("spam")!.push(holding);
    else buckets.get("unverified")!.push(holding);
  }

  // Registry health: how many contracts were flipped back to pending by the
  // last scan, and of those, how many already carry a verification verdict.
  const freshContractRows = [...freshRegistry.values()];
  const pendingRows = freshContractRows.filter((c) => c.status === "pending");
  const pendingStillVerified = pendingRows.filter((c) => c.is_verified === true).length;
  const pendingUnverified = pendingRows.filter((c) => c.is_verified !== true).length;
  console.log(
    `Registry health: ${freshContractRows.length} contract(s) — ${pendingRows.length} stuck in status=pending ` +
      `(of which ${pendingStillVerified} already verified, ${pendingUnverified} not verified)`
  );

  console.log(
    `Fresh holdings: ${freshByKey.size} unique NFT(s) across ${freshAddresses.length} contract(s) → ` +
      `counted ${buckets.get("counted")!.length}, unverified-excluded ${buckets.get("unverified")!.length}, ` +
      `spam-excluded ${buckets.get("spam")!.length}, pending ${buckets.get("pending")!.length}, ` +
      `not-in-registry ${buckets.get("missing_registry")!.length}`
  );

  const layer2 = pointsFor(buckets.get("counted")!);
  console.log(
    `Expected score from fresh data (current registry): ${layer2.total} ` +
      `(rare×${layer2.rareCount}, early×${layer2.earlyCount}, nft_count would be ${buckets.get("counted")!.length})`
  );
  check(layer2.total === rank1.score, `stored score ${rank1.score} matches fresh recomputation ${layer2.total}`);
  check(
    buckets.get("counted")!.length === rank1.nft_count,
    `stored nft_count ${rank1.nft_count} matches fresh counted NFTs ${buckets.get("counted")!.length}`
  );

  // Staleness diff: tokens present on-chain but absent from DB (and vice versa)
  const storedKeys = new Set(storedHoldings.map((h) => holdingKey(h.contract_address, h.token_id)));
  const gained = [...freshByKey.keys()].filter((key) => !storedKeys.has(key));
  const lost = [...storedKeys].filter((key) => !freshByKey.has(key));
  if (gained.length > 0 || lost.length > 0) {
    console.log(
      `Drift since last scan: +${gained.length} new on-chain, -${lost.length} no longer held ` +
        `(score refresh will move it)`
    );
    for (const key of gained.slice(0, 10)) console.log(`   + ${key}`);
    for (const key of lost.slice(0, 10)) console.log(`   - ${key}`);
  } else {
    console.log("Drift since last scan: none — stored holdings match on-chain exactly");
  }

  // Findings that would change the next scan's result
  const potential = buckets.get("missing_registry")!.length + buckets.get("pending")!.length;
  if (potential > 0) {
    console.log(
      `[NOTE] ${potential} holding(s) sit outside the evaluated registry right now ` +
        `(pending/unknown). They are excluded today; after the next scan they may add ` +
        `points if their contracts verify.`
    );
    for (const holding of [...buckets.get("missing_registry")!, ...buckets.get("pending")!].slice(0, 10)) {
      console.log(`   ? ${holdingKey(holding.contractAddress, holding.tokenId)} (${holding.metadata?.name || "unnamed"})`);
    }
  }

  // ---- Per-NFT contribution detail (counted only) ----
  console.log("\n--- Counted NFT contribution detail (fresh data) ---");
  for (const holding of buckets.get("counted")!) {
    const metaName = (holding.metadata as { name?: string })?.name || "unnamed";
    const parts: string[] = [];
    if (hasRareTrait(holding.metadata)) parts.push(`rare +${scoreRules.points.rareTrait}`);
    if (isEarly(holding.tokenId)) parts.push(`early +${scoreRules.points.earlyTokenId}`);
    console.log(
      `  ${shortAddress(holding.contractAddress)} #${holding.tokenId} "${metaName}" ${
        parts.length ? parts.join(", ") : "(base)"
      }`
    );
  }

  // ---- Summary ----
  console.log("\n==========================================================");
  console.log(`Audit summary: ${passed} passed, ${failed} failed.`);
  if (failed === 0) {
    console.log(`Rank #1 (@${handle}) score ${rank1.score} is consistent with the scoring engine.`);
  } else {
    console.log("Discrepancies found — see [FAIL] lines above.");
  }
  console.log("==========================================================");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Audit crashed:", err);
  process.exit(1);
});
