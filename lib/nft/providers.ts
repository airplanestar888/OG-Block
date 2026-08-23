import { createPublicClient, getContract, http, type Address } from "viem";
import { env } from "@/lib/env";
import { getNftBlocklist, type NftBlocklist } from "@/lib/nft/blocklist";
import type { NftHolding } from "@/lib/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const baseChain = {
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [env.BASE_RPC_URL] }
  }
};

const erc721EnumerableAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

const erc721OwnershipAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

const erc1155OwnershipAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "uri",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

type AlchemyTransfer = {
  category?: "erc721" | "erc1155";
  erc721TokenId?: string;
  erc1155Metadata?: Array<{ tokenId?: string }>;
  tokenId?: string;
  rawContract?: { address?: string };
};

type AlchemyOwnedNft = {
  contract?: {
    address?: string;
    openSeaMetadata?: {
      floorPrice?: number | null;
      safelistRequestStatus?: string | null;
    };
  };
  spamInfo?: {
    isSpam?: boolean;
    classifications?: string[];
  };
  tokenId?: string;
  raw?: { metadata?: Record<string, unknown> };
  name?: string;
};

type BasescanSourceCodeResponse = {
  status?: string;
  message?: string;
  result?: Array<{
    SourceCode?: string;
    ABI?: string;
    ContractName?: string;
  }>;
};

type ContractCreator = {
  name: string;
  address: string;
};

const verifiedContractCache = new Map<string, boolean>();
const contractCreatorCache = new Map<string, ContractCreator | null>();

/// Run async tasks over items with bounded concurrency — BaseScan rate-limits
/// aggressive bursts, so contract lookups go through this instead of
/// sequential awaits (slow) or unbounded Promise.all (rate-limited).
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function isBlockedNft(contractAddress: string | undefined, creator: ContractCreator | undefined, blocklist: NftBlocklist): boolean {
  if (!contractAddress) return false;

  if (blocklist.contracts.has(contractAddress.toLowerCase())) return true;

  if (creator) {
    if (creator.address && blocklist.creators.has(creator.address.toLowerCase())) return true;
    if (creator.name && /phishing/i.test(creator.name)) return true;
  }

  return false;
}

export interface NftProvider {
  getHoldings(address: string, contractAddress: string): Promise<NftHolding[]>;
}

function shouldFilterContract(contractAddress: string) {
  const normalized = contractAddress.toLowerCase();
  return normalized !== "all" && normalized !== "0x0000000000000000000000000000000000000000";
}

/// Chains that have a verified working Alchemy NFT v3 endpoint.
/// Solana uses the same /nft/v3/getNFTsForOwner format as EVM chains.
/// Note: Solana addresses are base58 (not 0x). EVM wallets won't have Solana
/// NFTs unless the user provides a Solana wallet address separately.
const SUPPORTED_CHAINS = [
  { id: 8453, name: "Base", host: "base-mainnet.g.alchemy.com", isEvm: true },
  { id: 1, name: "Ethereum", host: "eth-mainnet.g.alchemy.com", isEvm: true },
  { id: 4663, name: "Robinhood", host: "robinhood-mainnet.g.alchemy.com", isEvm: true },
  { id: 1399811149, name: "Solana", host: "solana-mainnet.g.alchemy.com", isEvm: false }
] as const;

class MockNftProvider implements NftProvider {
  async getHoldings(address: string, contractAddress: string): Promise<NftHolding[]> {
    if (!address) return [];
    return [
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
        tokenId: "42",
        metadata: {
          name: "Base Culture #42",
          chain: "Base",
          attributes: [{ trait_type: "Edition", value: "Genesis" }]
        }
      },
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0x6fd053bff10512d743fa36c859e49351a4920df6",
        tokenId: "711",
        metadata: {
          name: "Onchain Identity #711",
          chain: "Ethereum",
          attributes: [{ trait_type: "Status", value: "OG" }]
        }
      },
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
        tokenId: "108",
        metadata: {
          name: "Robinhood Edition #108",
          chain: "Robinhood",
          attributes: [{ trait_type: "Tier", value: "Early" }]
        }
      },
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0x9c37279c09c5d012469ee944aa04fba73491322a",
        tokenId: "99",
        metadata: {
          name: "Solana Culture #99",
          chain: "Solana",
          attributes: [{ trait_type: "Status", value: "OG" }]
        }
      }
    ];
  }
}

async function fetchChainNftsFromAlchemy(
  chainHost: string,
  chainName: string,
  address: string,
  contractAddress: string,
  apiKey: string
): Promise<AlchemyOwnedNft[]> {
  const ownedNfts: AlchemyOwnedNft[] = [];
  let pageKey: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`https://${chainHost}/nft/v3/${apiKey}/getNFTsForOwner`);
    url.searchParams.set("owner", address);
    if (shouldFilterContract(contractAddress)) {
      url.searchParams.set("contractAddresses[]", contractAddress);
    }
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);
    if (env.NFT_EXCLUDE_SPAM && !env.NFT_REQUIRE_VERIFIED_CONTRACT) {
      url.searchParams.append("excludeFilters[]", "SPAM");
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) break;

      const payload = (await response.json()) as { ownedNfts?: AlchemyOwnedNft[]; pageKey?: string };
      for (const nft of payload.ownedNfts || []) {
        (nft as Record<string, unknown>)._chain = chainName;
        ownedNfts.push(nft);
      }
      pageKey = payload.pageKey;
      if (!pageKey) break;
    } catch {
      break;
    }
  }

  return ownedNfts;
}

class AlchemyNftProvider implements NftProvider {
  async getHoldings(address: string, contractAddress: string): Promise<NftHolding[]> {
    if (!env.NFT_PROVIDER_API_KEY) throw new Error("NFT_PROVIDER_API_KEY is required for Alchemy");
    const ownedNfts: AlchemyOwnedNft[] = [];

    // Fetch in parallel across all supported chains.
    // Solana uses base58 addresses (non-0x) — skip it for EVM wallets to avoid
    // pointless 403s. Solana NFTs require a Solana wallet address.
    const isEvmAddress = address.startsWith("0x");
    const chainsToFetch = SUPPORTED_CHAINS.filter((c) => c.isEvm === isEvmAddress);

    const results = await Promise.allSettled(
      chainsToFetch.map((c) =>
        fetchChainNftsFromAlchemy(c.host, c.name, address, contractAddress, env.NFT_PROVIDER_API_KEY!)
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        ownedNfts.push(...result.value);
      }
    }

    // If no NFTs returned from multi-chain getNFTsForOwner, fallback to transfer history
    if (ownedNfts.length === 0) {
      return getHoldingsFromAlchemyTransfers(address, contractAddress, env.NFT_PROVIDER_API_KEY);
    }

  const contractAddresses = ownedNfts.map((nft) => nft.contract?.address);
  // Cap the auxiliary lookups so a wallet holding NFTs from many different
  // contracts can't run the function past its time limit. Verified-contract
  // results are cached per warm instance, so later runs are near-instant.
  const [verifiedContracts, contractCreators, blocklist] = await Promise.all([
    withTimeout(getVerifiedContractMap(contractAddresses), 15_000, new Map<string, boolean>()),
    withTimeout(getContractCreatorMap(contractAddresses), 10_000, new Map<string, ContractCreator>()),
    getNftBlocklist()
  ]);

    return ownedNfts
      .filter((nft) => {
        const creator = nft.contract?.address
          ? contractCreators.get(nft.contract.address.toLowerCase())
          : undefined;
        return !isBlockedNft(nft.contract?.address, creator, blocklist) && isGenuineAlchemyNft(nft, verifiedContracts);
      })
      .map((nft) => ({
        contractAddress: nft.contract?.address || contractAddress,
        tokenId: nft.tokenId || "0",
        metadata: withContractCreatorMetadata(
          {
            ...(nft.raw?.metadata || {}),
            name: nft.raw?.metadata?.name || nft.name,
            chain: (nft as Record<string, unknown>)._chain || "Base"
          },
          nft.contract?.address || contractAddress,
          contractCreators
        )
      }));
  }
}

async function getHoldingsFromAlchemyTransfers(address: string, contractAddress: string, apiKey: string) {
  const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
  const normalizedWallet = address.toLowerCase();
  const candidateMap = new Map<string, { contractAddress: string; tokenId: string; category: "erc721" | "erc1155" }>();
  let pageKey: string | undefined;

  for (let page = 0; page < 4; page += 1) {
    const params: Record<string, unknown> = {
      fromBlock: "0x0",
      toBlock: "latest",
      toAddress: address,
      category: ["erc721", "erc1155"],
      maxCount: "0x64"
    };
    if (pageKey) params.pageKey = pageKey;

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: page + 1,
        method: "alchemy_getAssetTransfers",
        params: [params]
      })
    });

    if (!response.ok) throw new Error(`Alchemy transfer request failed: ${response.status}`);
    const payload = (await response.json()) as {
      result?: { transfers?: AlchemyTransfer[]; pageKey?: string };
      error?: { message?: string };
    };
    if (payload.error) throw new Error(payload.error.message || "Alchemy transfer request failed");

    for (const transfer of payload.result?.transfers || []) {
      const transferContract = transfer.rawContract?.address?.toLowerCase();
      if (!transferContract) continue;
      if (shouldFilterContract(contractAddress) && transferContract !== contractAddress.toLowerCase()) continue;

      const tokenIds =
        transfer.category === "erc1155"
          ? (transfer.erc1155Metadata || []).map((item) => item.tokenId).filter(Boolean)
          : [transfer.erc721TokenId || transfer.tokenId].filter(Boolean);

      for (const tokenIdHex of tokenIds) {
        const tokenId = tokenIdFromHex(tokenIdHex!);
        candidateMap.set(`${transferContract}:${tokenId}:${transfer.category || "erc721"}`, {
          contractAddress: transferContract,
          tokenId,
          category: transfer.category || "erc721"
        });
      }
    }

    pageKey = payload.result?.pageKey;
    if (!pageKey) break;
  }

  const client = createPublicClient({ chain: baseChain, transport: http(rpcUrl) });
  const holdings: NftHolding[] = [];
  const candidateContracts = [...candidateMap.values()].map((candidate) => candidate.contractAddress);
  const [verifiedContracts, contractCreators, blocklist] = await Promise.all([
    getVerifiedContractMap(candidateContracts),
    getContractCreatorMap(candidateContracts),
    getNftBlocklist()
  ]);

  for (const candidate of candidateMap.values()) {
    if (holdings.length >= 100) break;
    if (isBlockedNft(candidate.contractAddress, undefined, blocklist)) continue;
    if (env.NFT_REQUIRE_VERIFIED_CONTRACT && !verifiedContracts.get(candidate.contractAddress.toLowerCase())) continue;
    try {
      const tokenId = BigInt(candidate.tokenId);
      let metadataUri = "";

      if (candidate.category === "erc1155") {
        const contract = getContract({
          address: candidate.contractAddress as Address,
          abi: erc1155OwnershipAbi,
          client
        });
        const balance = await contract.read.balanceOf([address as Address, tokenId]);
        if (balance === 0n) continue;
        metadataUri = await contract.read.uri([tokenId]);
      } else {
        const contract = getContract({
          address: candidate.contractAddress as Address,
          abi: erc721OwnershipAbi,
          client
        });
        const owner = await contract.read.ownerOf([tokenId]);
        if (owner.toLowerCase() !== normalizedWallet) continue;
        metadataUri = await contract.read.tokenURI([tokenId]);
      }

      const metadata = await fetchNftMetadata(metadataUri, candidate.tokenId);
      const creator = contractCreators.get(candidate.contractAddress.toLowerCase());
      if (isBlockedNft(candidate.contractAddress, creator, blocklist)) continue;
      holdings.push({
        contractAddress: candidate.contractAddress,
        tokenId: candidate.tokenId,
        metadata: withContractCreatorMetadata(metadata, candidate.contractAddress, contractCreators)
      });
    } catch {
      continue;
    }
  }

  return holdings;
}

function isGenuineAlchemyNft(nft: AlchemyOwnedNft, verifiedContracts: Map<string, boolean>) {
  const contractAddress = nft.contract?.address?.toLowerCase();
  if (!contractAddress) return false;

  if (env.NFT_REQUIRE_VERIFIED_CONTRACT && !verifiedContracts.get(contractAddress)) return false;
  if (env.NFT_REQUIRE_VERIFIED_CONTRACT && verifiedContracts.get(contractAddress)) return true;
  if (env.NFT_EXCLUDE_SPAM && nft.spamInfo?.isSpam) return false;

  const floorPrice = nft.contract?.openSeaMetadata?.floorPrice;
  if (env.NFT_MIN_FLOOR_PRICE_ETH > 0) {
    return typeof floorPrice === "number" && floorPrice >= env.NFT_MIN_FLOOR_PRICE_ETH;
  }

  return true;
}

async function getVerifiedContractMap(contractAddresses: Array<string | undefined>) {
  const uniqueContracts = [...new Set(contractAddresses.filter(Boolean).map((address) => address!.toLowerCase()))];
  const verifiedMap = new Map<string, boolean>();

  if (!env.NFT_REQUIRE_VERIFIED_CONTRACT) return verifiedMap;

  const results = await mapWithConcurrency(uniqueContracts, 4, async (contractAddress) => {
    const cached = verifiedContractCache.get(contractAddress);
    if (cached !== undefined) return { contractAddress, verified: cached };
    const verified = await isContractSourceVerifiedOnBasescan(contractAddress);
    verifiedContractCache.set(contractAddress, verified);
    return { contractAddress, verified };
  });

  for (const { contractAddress, verified } of results) {
    verifiedMap.set(contractAddress, verified);
  }

  return verifiedMap;
}

async function getContractCreatorMap(contractAddresses: Array<string | undefined>) {
  const uniqueContracts = [...new Set(contractAddresses.filter(Boolean).map((address) => address!.toLowerCase()))];
  const creatorMap = new Map<string, ContractCreator>();

  await mapWithConcurrency(uniqueContracts, 4, async (contractAddress) => {
    if (contractCreatorCache.has(contractAddress)) {
      const cached = contractCreatorCache.get(contractAddress);
      if (cached) creatorMap.set(contractAddress, cached);
      return;
    }
    const creator = await getContractCreatorFromBasescan(contractAddress);
    contractCreatorCache.set(contractAddress, creator);
    if (creator) creatorMap.set(contractAddress, creator);
  });

  return creatorMap;
}

/// Wrap a promise with a deadline — on timeout it resolves to the fallback so
/// a slow metadata/lookup call can't blow the whole score request past the
/// function's maxDuration (which returns an HTML error page, not JSON).
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function isContractSourceVerifiedOnBasescan(contractAddress: string) {
  if (!env.BASESCAN_API_KEY) return false;

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("apikey", env.BASESCAN_API_KEY);

  // Distinguish a real answer from a failed lookup. A definitive response tells
  // us verified true/false; repeated network/rate-limit failures must NOT be
  // treated as "unverified" (that silently drops genuine NFTs). Throw instead
  // so the scoring layer can retry rather than persist an undercount.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        await sleep(1200);
        continue;
      }

      const payload = (await response.json()) as BasescanSourceCodeResponse;
      // Rate limit / transient API error → retry, do not conclude "unverified".
      if (payload.status === "0" && /rate limit|max .*rate|busy/i.test(payload.message || "")) {
        await sleep(1200);
        continue;
      }

      const source = Array.isArray(payload.result) ? payload.result[0] : null;
      if (!source) {
        await sleep(1200);
        continue;
      }

      const sourceCode = source.SourceCode?.trim();
      const abi = source.ABI?.trim();
      const contractName = source.ContractName?.trim();

      // Definitive answer — verified only if source is actually published.
      return Boolean(sourceCode && contractName && abi && abi !== "Contract source code not verified");
    } catch {
      await sleep(1200);
    }
  }

  throw new Error(`BaseScan verification lookup failed for ${contractAddress}`);
}

async function getContractCreatorFromBasescan(contractAddress: string): Promise<ContractCreator | null> {
  try {
    const response = await fetch(`https://basescan.org/address/${contractAddress}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 OG-Block score refresh"
      },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return null;

    const html = await response.text();
    const creatorSection = html.match(/Contract Creator[\s\S]{0,3000}/i)?.[0] || "";
    const creatorMatch =
      creatorSection.match(/href=['"]\/address\/(0x[a-fA-F0-9]{40})['"][\s\S]{0,500}?>([^<]+)<\/a>/i) ||
      html.match(/href=['"]\/address\/(0x[a-fA-F0-9]{40})['"][^>]*title=['"]([^'"]*\([^)]*\))['"][\s\S]{0,200}?>([^<]+)<\/a>/i);
    if (!creatorMatch) return null;

    return {
      address: creatorMatch[1],
      name: decodeHtmlEntities((creatorMatch[3] || creatorMatch[2]).trim())
    };
  } catch {
    return null;
  }
}

function withContractCreatorMetadata(
  metadata: Record<string, unknown>,
  contractAddress: string,
  contractCreators: Map<string, ContractCreator>
) {
  const creator = contractCreators.get(contractAddress.toLowerCase());
  if (!creator) return metadata;

  return {
    ...metadata,
    creator
  };
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function tokenIdFromHex(tokenId: string) {
  if (tokenId.startsWith("0x")) return BigInt(tokenId).toString();
  return tokenId;
}

async function fetchNftMetadata(uri: string, tokenId: string) {
  const url = normalizeMetadataUri(uri, tokenId);
  if (!url) return {};

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return {};
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeMetadataUri(uri: string, tokenId: string) {
  if (!uri) return "";
  const normalizedTokenId = BigInt(tokenId).toString(16).padStart(64, "0");
  const expanded = uri.replace("{id}", normalizedTokenId);
  if (expanded.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${expanded.slice("ipfs://".length)}`;
  if (expanded.startsWith("http://") || expanded.startsWith("https://")) return expanded;
  return "";
}

class RpcNftProvider implements NftProvider {
  async getHoldings(address: string, contractAddress: string): Promise<NftHolding[]> {
    if (!shouldFilterContract(contractAddress)) {
      throw new Error("RPC provider requires TARGET_NFT_CONTRACT_ADDRESS. Use NFT_PROVIDER=alchemy for all wallet NFTs.");
    }
    const client = createPublicClient({ chain: baseChain, transport: http(env.BASE_RPC_URL) });
    const contract = getContract({
      address: contractAddress as Address,
      abi: erc721EnumerableAbi,
      client
    });

    const balance = await contract.read.balanceOf([address as Address]);
    const max = Number(balance > 100n ? 100n : balance);
    const holdings: NftHolding[] = [];

    for (let index = 0; index < max; index += 1) {
      const tokenId = await contract.read.tokenOfOwnerByIndex([address as Address, BigInt(index)]);
      holdings.push({
        contractAddress,
        tokenId: tokenId.toString(),
        metadata: {}
      });
    }

    return holdings;
  }
}

export function getNftProvider(): NftProvider {
  if (env.NFT_PROVIDER === "alchemy") return new AlchemyNftProvider();
  if (env.NFT_PROVIDER === "rpc") return new RpcNftProvider();

  // Fail closed: mock is only allowed when explicitly set AND not in production.
  if (env.NFT_PROVIDER === "mock" && process.env.NODE_ENV !== "production") {
    return new MockNftProvider();
  }

  // Any other value (including undefined) is a misconfiguration.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `NFT_PROVIDER="${env.NFT_PROVIDER ?? ""}" is not valid for production. Set NFT_PROVIDER to "alchemy" or "rpc".`
    );
  }

  // Non-production fallback when provider is unset.
  return new MockNftProvider();
}
