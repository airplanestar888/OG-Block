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

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alchemy NFT request failed: ${response.status}`);
    const payload = (await response.json()) as {
      ownedNfts?: Array<{
        contract?: { address?: string };
        tokenId?: string;
        raw?: { metadata?: Record<string, unknown> };
        name?: string;
      }>;
    };

    return (payload.ownedNfts || []).map((nft) => ({
      contractAddress: nft.contract?.address || contractAddress,
      tokenId: nft.tokenId || "0",
      metadata: {
        ...(nft.raw?.metadata || {}),
        name: nft.raw?.metadata?.name || nft.name
      }
    }));
  }
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
