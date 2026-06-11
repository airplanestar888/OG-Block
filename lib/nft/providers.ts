import { createPublicClient, getContract, http, type Address } from "viem";
import { env } from "@/lib/env";
import type { NftHolding } from "@/lib/types";

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

export interface NftProvider {
  getHoldings(address: string, contractAddress: string): Promise<NftHolding[]>;
}

function shouldFilterContract(contractAddress: string) {
  const normalized = contractAddress.toLowerCase();
  return normalized !== "all" && normalized !== "0x0000000000000000000000000000000000000000";
}

class MockNftProvider implements NftProvider {
  async getHoldings(address: string, contractAddress: string): Promise<NftHolding[]> {
    if (!address) return [];
    return [
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e",
        tokenId: "42",
        metadata: {
          name: "Base Culture #42",
          attributes: [{ trait_type: "Edition", value: "Genesis" }]
        }
      },
      {
        contractAddress: shouldFilterContract(contractAddress) ? contractAddress : "0x6fd053bff10512d743fa36c859e49351a4920df6",
        tokenId: "711",
        metadata: {
          name: "Onchain Identity #711",
          attributes: [{ trait_type: "Status", value: "OG" }]
        }
      }
    ];
  }
}

class AlchemyNftProvider implements NftProvider {
  async getHoldings(address: string, contractAddress: string): Promise<NftHolding[]> {
    if (!env.NFT_PROVIDER_API_KEY) throw new Error("NFT_PROVIDER_API_KEY is required for Alchemy");
    const url = new URL(`https://base-mainnet.g.alchemy.com/nft/v3/${env.NFT_PROVIDER_API_KEY}/getNFTsForOwner`);
    url.searchParams.set("owner", address);
    if (shouldFilterContract(contractAddress)) {
      url.searchParams.set("contractAddresses[]", contractAddress);
    }
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");
    if (env.NFT_EXCLUDE_SPAM && !env.NFT_REQUIRE_VERIFIED_CONTRACT) {
      url.searchParams.append("excludeFilters[]", "SPAM");
    }

    const response = await fetch(url);
    if (!response.ok) {
      return getHoldingsFromAlchemyTransfers(address, contractAddress, env.NFT_PROVIDER_API_KEY);
    }
    const payload = (await response.json()) as { ownedNfts?: AlchemyOwnedNft[] };
    const contractAddresses = (payload.ownedNfts || []).map((nft) => nft.contract?.address);
    const [verifiedContracts, contractCreators] = await Promise.all([
      getVerifiedContractMap(contractAddresses),
      getContractCreatorMap(contractAddresses)
    ]);

    return (payload.ownedNfts || [])
      .filter((nft) => isGenuineAlchemyNft(nft, verifiedContracts))
      .map((nft) => ({
        contractAddress: nft.contract?.address || contractAddress,
        tokenId: nft.tokenId || "0",
        metadata: withContractCreatorMetadata(
          {
            ...(nft.raw?.metadata || {}),
            name: nft.raw?.metadata?.name || nft.name
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
  const [verifiedContracts, contractCreators] = await Promise.all([
    getVerifiedContractMap(candidateContracts),
    getContractCreatorMap(candidateContracts)
  ]);

  for (const candidate of candidateMap.values()) {
    if (holdings.length >= 100) break;
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

  await Promise.all(
    uniqueContracts.map(async (contractAddress) => {
      verifiedMap.set(contractAddress, await isContractSourceVerifiedOnBasescan(contractAddress));
    })
  );

  return verifiedMap;
}

async function getContractCreatorMap(contractAddresses: Array<string | undefined>) {
  const uniqueContracts = [...new Set(contractAddresses.filter(Boolean).map((address) => address!.toLowerCase()))];
  const creatorMap = new Map<string, ContractCreator>();

  await Promise.all(
    uniqueContracts.map(async (contractAddress) => {
      const creator = await getContractCreatorFromBasescan(contractAddress);
      if (creator) creatorMap.set(contractAddress, creator);
    })
  );

  return creatorMap;
}

async function isContractSourceVerifiedOnBasescan(contractAddress: string) {
  if (!env.BASESCAN_API_KEY) return false;

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  url.searchParams.set("apikey", env.BASESCAN_API_KEY);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return false;

    const payload = (await response.json()) as BasescanSourceCodeResponse;
    const source = Array.isArray(payload.result) ? payload.result[0] : null;
    if (!source) return false;

    const sourceCode = source.SourceCode?.trim();
    const abi = source.ABI?.trim();
    const contractName = source.ContractName?.trim();

    return Boolean(sourceCode && contractName && abi && abi !== "Contract source code not verified");
  } catch {
    return false;
  }
}

async function getContractCreatorFromBasescan(contractAddress: string): Promise<ContractCreator | null> {
  try {
    const response = await fetch(`https://basescan.org/address/${contractAddress}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return null;

    const html = await response.text();
    const creatorSection = html.match(/Contract Creator[\s\S]{0,3000}/i)?.[0] || "";
    const creatorMatch = creatorSection.match(/href=['"]\/address\/(0x[a-fA-F0-9]{40})['"][\s\S]{0,500}?>([^<]+)<\/a>/i);
    if (!creatorMatch) return null;

    return {
      address: creatorMatch[1],
      name: decodeHtmlEntities(creatorMatch[2].trim())
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
  return new MockNftProvider();
}
