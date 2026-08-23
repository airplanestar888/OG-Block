import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Contract registry — the heart of the scoring redesign.
 *
 * Flow:
 *   1. A wallet is scanned ONCE via Alchemy getContractsForOwner, which returns
 *      every contract it holds along with isSpam + deployer (free-plan safe).
 *   2. Each contract is UPSERTED into nft_contracts (status pending).
 *   3. Contracts are evaluated ONCE: spam from Alchemy, verified from BaseScan.
 *      The result is cached in the table and reused for every other wallet
 *      holding the same contract — never fetched again.
 *   4. Scoring reads the registry: spam → 0, unverified → 0, verified → counted.
 *   5. Admin "refresh" re-evaluates only status='failed' contracts and rebuilds
 *      ranks — it does NOT re-scan wallets (points were captured at scan time).
 */

export type ContractStatus = "pending" | "ok" | "failed";

export type ContractRecord = {
  contract_address: string;
  chain_id: number;
  name: string | null;
  symbol: string | null;
  token_type: string | null;
  deployer_address: string | null;
  is_spam: boolean | null;
  spam_classifications: string[] | null;
  is_verified: boolean | null;
  status: ContractStatus;
  eval_error: string | null;
  evaluated_at: string | null;
};

type AlchemyContract = {
  address?: string;
  name?: string | null;
  symbol?: string | null;
  tokenType?: string | null;
  contractDeployer?: string | null;
  isSpam?: boolean;
  spamClassifications?: string[];
  openSeaMetadata?: { collectionName?: string | null };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch every contract a wallet holds (one call per chain, free-plan safe). */
async function fetchContractsForOwner(address: string): Promise<AlchemyContract[]> {
  const apiKey = env.NFT_PROVIDER_API_KEY;
  if (!apiKey) throw new Error("NFT_PROVIDER_API_KEY is required");

  // Only EVM chains for a 0x wallet; Solana uses base58.
  const isEvm = address.startsWith("0x");
  const hosts = isEvm
    ? ["base-mainnet.g.alchemy.com", "eth-mainnet.g.alchemy.com"]
    : ["solana-mainnet.g.alchemy.com"];

  const all: AlchemyContract[] = [];
  const errors: string[] = [];

  await Promise.all(
    hosts.map(async (host) => {
      const url = new URL(`https://${host}/nft/v3/${apiKey}/getContractsForOwner`);
      url.searchParams.set("owner", address);
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          errors.push(`getContractsForOwner ${host} ${res.status}: ${body.slice(0, 120)}`);
          return;
        }
        const body = (await res.json()) as { contracts?: AlchemyContract[] };
        for (const c of body.contracts || []) all.push(c);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    })
  );

  // If every chain errored, surface it — never report "no contracts".
  if (all.length === 0 && errors.length > 0) {
    throw new Error(`Alchemy contract scan failed: ${errors[0]}`);
  }
  return all;
}

/** BaseScan verified-source check with retries; throws on transient failure. */
async function isContractVerified(contractAddress: string): Promise<boolean> {
  if (!env.BASESCAN_API_KEY) return false;
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("apikey", env.BASESCAN_API_KEY);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        await sleep(1000);
        continue;
      }
      const body = (await res.json()) as {
        status?: string;
        message?: string;
        result?: Array<{ SourceCode?: string; ABI?: string; ContractName?: string }>;
      };
      if (body.status === "0" && /rate limit|max .*rate|busy/i.test(body.message || "")) {
        await sleep(1000);
        continue;
      }
      const src = Array.isArray(body.result) ? body.result[0] : null;
      if (!src) {
        await sleep(1000);
        continue;
      }
      const source = src.SourceCode?.trim();
      const abi = src.ABI?.trim();
      return Boolean(source && src.ContractName?.trim() && abi && abi !== "Contract source code not verified");
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`BaseScan verification failed for ${contractAddress}`);
}

/**
 * Register the contracts a wallet holds into nft_contracts (idempotent).
 * Returns the registry rows for those contracts (post-evaluation).
 */
export async function registerWalletContracts(address: string): Promise<ContractRecord[]> {
  const supabase = getSupabaseAdmin();
  const contracts = await fetchContractsForOwner(address);

  // Upsert basic identity + spam signal; keep existing evaluation if present.
  for (const c of contracts) {
    const addr = c.address?.toLowerCase();
    if (!addr) continue;
    await supabase.from("nft_contracts").upsert(
      {
        contract_address: addr,
        name: c.name || c.openSeaMetadata?.collectionName || null,
        symbol: c.symbol || null,
        token_type: c.tokenType || null,
        deployer_address: c.contractDeployer?.toLowerCase() || null,
        is_spam: c.isSpam ?? null,
        spam_classifications: c.spamClassifications || null,
        // only mark pending if never evaluated; don't clobber an ok/failed row
        status: "pending",
        updated_at: new Date().toISOString()
      },
      { onConflict: "contract_address", ignoreDuplicates: false }
    );
  }

  // Evaluate any that are still pending (verified check is the expensive part).
  await evaluatePendingContracts(20);

  const addresses = contracts.map((c) => c.address?.toLowerCase()).filter(Boolean) as string[];
  if (addresses.length === 0) return [];
  const { data } = await supabase
    .from("nft_contracts")
    .select("*")
    .in("contract_address", addresses);
  return (data || []) as ContractRecord[];
}

/**
 * Evaluate pending/failed contracts: run the BaseScan verified check and mark
 * each row ok/failed. Bounded so a scan never blows the function time budget.
 */
export async function evaluatePendingContracts(limit = 20): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: pending } = await supabase
    .from("nft_contracts")
    .select("contract_address,is_spam")
    .eq("status", "pending")
    .limit(limit);

  let done = 0;
  for (const row of pending || []) {
    const addr = row.contract_address as string;
    // Verified (BaseScan) is the source of truth — a verified contract counts
    // even if Alchemy flags it spam (Alchemy over-flags legit collections).
    // So we ALWAYS run the BaseScan check, spam or not.
    try {
      const verified = await isContractVerified(addr);
      await supabase
        .from("nft_contracts")
        .update({ is_verified: verified, status: "ok", evaluated_at: new Date().toISOString(), eval_error: null })
        .eq("contract_address", addr);
      done += 1;
    } catch (e) {
      await supabase
        .from("nft_contracts")
        .update({ status: "failed", eval_error: e instanceof Error ? e.message : String(e), updated_at: new Date().toISOString() })
        .eq("contract_address", addr);
    }
    await sleep(200); // be gentle with BaseScan free tier
  }
  return done;
}

/** Re-evaluate contracts whose last evaluation failed. Used by admin snapshot. */
export async function reevaluateFailedContracts(limit = 50): Promise<number> {
  const supabase = getSupabaseAdmin();
  // Move failed → pending so evaluatePendingContracts picks them up.
  const { data: failed } = await supabase
    .from("nft_contracts")
    .select("contract_address")
    .eq("status", "failed")
    .limit(limit);
  const addrs = (failed || []).map((r) => r.contract_address as string);
  if (addrs.length === 0) return 0;
  await supabase.from("nft_contracts").update({ status: "pending" }).in("contract_address", addrs);
  return evaluatePendingContracts(limit);
}

/**
 * Whether a contract's NFTs count toward the score.
 * Verified (BaseScan) overrides everything: a verified contract always counts,
 * even if Alchemy flags it as spam. Unverified + spam → excluded.
 */
export function isCounted(c: Pick<ContractRecord, "is_spam" | "is_verified">): boolean {
  if (c.is_verified === true) return true;       // verified → always counted
  if (c.is_spam === true) return false;           // unverified spam → excluded
  // Not verified, not spam: counted only when verified-status isn't required.
  return !env.NFT_REQUIRE_VERIFIED_CONTRACT;
}

/** Counts for transparency on the score card. */
export function contractCounts(contracts: ContractRecord[]) {
  const spam = contracts.filter((c) => c.is_spam === true).length;
  const verified = contracts.filter((c) => c.is_verified === true).length;
  const counted = contracts.filter((c) => isCounted(c)).length;
  const unverified = contracts.length - verified;
  return { total: contracts.length, spam, verified, unverified, counted };
}
