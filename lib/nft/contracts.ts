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

/** Fetch every contract a wallet holds (paginated, one chain set per wallet). */
/// Registration ceiling mirroring the holdings guard — hitting it must ERROR,
/// not truncate: an unregistered contract can never verify, so its NFTs would
/// silently vanish from every score built on this registry.
const MAX_CONTRACT_PAGES = 50;

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
      let pageKey: string | undefined;
      for (let page = 0; page < MAX_CONTRACT_PAGES; page += 1) {
        const url = new URL(`https://${host}/nft/v3/${apiKey}/getContractsForOwner`);
        url.searchParams.set("owner", address);
        url.searchParams.set("pageSize", "100");
        if (pageKey) url.searchParams.set("pageKey", pageKey);
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            errors.push(`getContractsForOwner ${host} ${res.status}: ${body.slice(0, 120)}`);
            return;
          }
          const body = (await res.json()) as { contracts?: AlchemyContract[]; pageKey?: string };
          for (const c of body.contracts || []) all.push(c);
          pageKey = body.pageKey;
          if (!pageKey) return;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
          return;
        }
      }
      errors.push(
        `getContractsForOwner ${host}: wallet ${address} exceeds ${
          MAX_CONTRACT_PAGES * 100
        } contracts — refusing a truncated registry`
      );
    })
  );

  // A failed chain yields a partial registry, and anything missing from the
  // registry is excluded from scoring — surface it instead of undercounting.
  if (errors.length > 0) {
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

/// PostgREST .in() filters fail at fetch level once the URL grows past a few
/// hundred values ("fetch failed" with data=null) — a whale wallet holds 500+
/// contracts, so every registry read goes through bounded chunks. Errors are
/// NEVER swallowed here: an empty-looking registry silently disables scoring
/// filters and counts spam NFTs.
const REGISTRY_QUERY_CHUNK = 100;

async function selectRegistryRows<T extends Record<string, unknown>>(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  columns: string,
  addresses: string[]
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < addresses.length; index += REGISTRY_QUERY_CHUNK) {
    const batch = addresses.slice(index, index + REGISTRY_QUERY_CHUNK);
    const { data, error } = await supabase
      .from("nft_contracts")
      .select(columns)
      .in("contract_address", batch);
    if (error) throw error;
    if (data) rows.push(...(data as unknown as T[]));
  }
  return rows;
}

/// Registry verdicts for arbitrary contract addresses (read-only, chunked).
/// getContractsForOwner misses contracts that getNFTsForOwner returns, so the
/// scoring filter must also resolve verdicts for contracts seen in holdings.
export async function getContractRecords(addresses: string[]): Promise<ContractRecord[]> {
  if (addresses.length === 0) return [];
  return selectRegistryRows<ContractRecord>(getSupabaseAdmin(), "*", addresses);
}

export async function registerWalletContracts(address: string): Promise<ContractRecord[]> {  const supabase = getSupabaseAdmin();
  const contracts = await fetchContractsForOwner(address);
  const addresses = contracts.map((c) => c.address?.toLowerCase()).filter(Boolean) as string[];

  // Read prior statuses BEFORE upserting so evaluated contracts keep their
  // verdict. Resetting ok/failed rows to "pending" on every scan forced the
  // BaseScan check to rerun forever and left a permanent pending backlog.
  const priorStatus = new Map<string, string>();
  if (addresses.length > 0) {
    const known = await selectRegistryRows<{ contract_address: string; status: string }>(
      supabase,
      "contract_address,status",
      addresses
    );
    for (const row of known) priorStatus.set(row.contract_address, row.status);
  }

  // Upsert basic identity + spam signal; keep existing evaluation if present.
  for (const c of contracts) {
    const addr = c.address?.toLowerCase();
    if (!addr) continue;
    const existingStatus = priorStatus.get(addr);
    const status: ContractStatus =
      existingStatus === "ok" || existingStatus === "failed" ? existingStatus : "pending";
    const { error } = await supabase.from("nft_contracts").upsert(
      {
        contract_address: addr,
        name: c.name || c.openSeaMetadata?.collectionName || null,
        symbol: c.symbol || null,
        token_type: c.tokenType || null,
        deployer_address: c.contractDeployer?.toLowerCase() || null,
        is_spam: c.isSpam ?? null,
        spam_classifications: c.spamClassifications || null,
        // only mark pending if never evaluated; don't clobber an ok/failed row
        status,
        updated_at: new Date().toISOString()
      },
      { onConflict: "contract_address", ignoreDuplicates: false }
    );
    if (error) throw error;
  }

  // Evaluate any that are still pending (verified check is the expensive part).
  await evaluatePendingContracts(20);

  if (addresses.length === 0) return [];
  return (await selectRegistryRows<ContractRecord>(
    supabase,
    "*",
    addresses
  )) as ContractRecord[];
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
