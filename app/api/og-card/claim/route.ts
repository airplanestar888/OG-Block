import { NextResponse } from "next/server";
import { z } from "zod";
import { createPublicClient, http, decodeEventLog, parseAbiItem } from "viem";
import { baseSepolia, base } from "viem/chains";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getOgCardConfig } from "@/lib/app-config";
import { rateLimit } from "@/lib/rate-limit";
import { OgCardAbi } from "@/lib/og-card-abi";

const MINTED_EVENT = parseAbiItem("event Minted(address indexed to, uint256 indexed tokenId)");

const claimSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenId: z.coerce.string().optional(),
  // tier & chainId from client are IGNORED — derived from chain config only.
  tier: z.string().max(32).optional(),
  chainId: z.coerce.number().int().positive().optional(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});

function getChain(chainId: number) {
  if (chainId === 8453) return base;
  if (chainId === 84532) return baseSepolia;
  return null;
}

/// Verify on-chain that the wallet actually minted an OG Card, and derive the
/// real tokenId + tier from the contract — never from the client payload.
/// When txHash is supplied, the server fetches the receipt and parses the
/// Minted event for authoritative tokenId + recipient.
async function verifyClaimOnChain(
  contractAddress: string,
  walletAddress: string,
  chainId: number,
  clientTokenId?: string,
  txHash?: string
): Promise<{ tokenId: string; tier: string }> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const client = createPublicClient({
    chain,
    transport: http()
  });

  // 0. If txHash is supplied, fetch the receipt and parse the Minted event.
  //    This is the most authoritative source — the blockchain receipt.
  if (txHash) {
    const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt.status !== "success") {
      throw new Error("Mint transaction failed on-chain");
    }

    // Parse the Minted event from receipt logs.
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [MINTED_EVENT],
          data: log.data,
          topics: log.topics
        });
        if (decoded.eventName === "Minted") {
          const args = decoded.args as { to: string; tokenId: bigint };
          if (args.to.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error("Mint event recipient does not match this wallet");
          }
          const verifiedTokenId = args.tokenId;

          // Verify ownership as a final guard.
          const owner = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: OgCardAbi,
            functionName: "ownerOf",
            args: [verifiedTokenId]
          });
          if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error("Token ownership verification failed");
          }

          // Derive tier on-chain.
          const tier = await client.readContract({
            address: contractAddress as `0x${string}`,
            abi: OgCardAbi,
            functionName: "tierOf",
            args: [verifiedTokenId]
          });

          return { tokenId: verifiedTokenId.toString(), tier };
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("does not match")) throw e;
        if (e instanceof Error && e.message.includes("failed")) throw e;
        // Not a Minted log — skip.
      }
    }
    // If txHash was provided but no Minted event found, fall through to
    // the hasClaimed + ownerOf path as a secondary check.
  }

  // 1. hasClaimed — did this wallet actually mint?
  const claimed = await client.readContract({
    address: contractAddress as `0x${string}`,
    abi: OgCardAbi,
    functionName: "hasClaimed",
    args: [walletAddress as `0x${string}`]
  });
  if (!claimed) {
    throw new Error("Wallet has not minted an OG Card on-chain");
  }

  // 2. Derive tokenId. If client supplied one, verify ownership.
  let tokenId: bigint | undefined;

  if (clientTokenId) {
    const tid = BigInt(clientTokenId);
    try {
      const owner = await client.readContract({
        address: contractAddress as `0x${string}`,
        abi: OgCardAbi,
        functionName: "ownerOf",
        args: [tid]
      });
      if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Token does not belong to this wallet");
      }
      tokenId = tid;
    } catch {
      throw new Error("Invalid or non-existent token ID");
    }
  }

  if (tokenId === undefined) {
    throw new Error("Token ID is required to verify ownership");
  }

  // 3. Derive tier on-chain — never trust client tier.
  const tier = await client.readContract({
    address: contractAddress as `0x${string}`,
    abi: OgCardAbi,
    functionName: "tierOf",
    args: [tokenId]
  });

  return { tokenId: tokenId.toString(), tier };
}

export async function POST(request: Request) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = `og-claim:${user.id}:${request.headers.get("x-forwarded-for") || "local"}`;
  if (!rateLimit(key, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const payload = claimSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid claim payload" }, { status: 400 });
  }

  const walletAddress = payload.data.walletAddress.toLowerCase();
  const supabase = getSupabaseAdmin();

  // Resolve the configured contract + chain.
  const config = await getOgCardConfig();
  if (!config.contractAddress) {
    return NextResponse.json({ error: "OG Card contract not configured" }, { status: 500 });
  }
  const chainId = config.chainId;

  // check if this wallet already claimed (idempotent)
  const { data: existing } = await supabase
    .from("og_card_claims")
    .select("id,user_id,claimed_at,token_id,tier,chain_id")
    .eq("wallet_address", walletAddress)
    .maybeSingle();

  if (existing) {
    if (existing.user_id === user.id) {
      // backfill token details if they weren't stored before
      if (!existing.token_id || !existing.tier || !existing.chain_id) {
        try {
          const verified = await verifyClaimOnChain(
            config.contractAddress,
            walletAddress,
            chainId,
            payload.data.tokenId,
            payload.data.txHash
          );
          await supabase
            .from("og_card_claims")
            .update({
              token_id: verified.tokenId,
              tier: verified.tier,
              chain_id: chainId
            })
            .eq("id", existing.id);
        } catch {
          // backfill failure is non-fatal — existing record stays
        }
      }
      return NextResponse.json({ claim: existing, message: "Already claimed" });
    }
    return NextResponse.json({ error: "This wallet already claimed an OG Card" }, { status: 409 });
  }

  // Verify on-chain before creating a claim record.
  let verified: { tokenId: string; tier: string };
  try {
    verified = await verifyClaimOnChain(
      config.contractAddress,
      walletAddress,
      chainId,
      payload.data.tokenId,
      payload.data.txHash
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "On-chain verification failed" },
      { status: 403 }
    );
  }

  // insert claim with verified values
  const { data: claim, error } = await supabase
    .from("og_card_claims")
    .insert({
      user_id: user.id,
      wallet_address: walletAddress,
      token_id: verified.tokenId,
      tier: verified.tier,
      chain_id: chainId
    })
    .select("id,user_id,wallet_address,claimed_at,token_id,tier,chain_id")
    .single();

  if (error) throw error;
  return NextResponse.json({ claim });
}

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: claim } = await supabase
    .from("og_card_claims")
    .select("id,wallet_address,claimed_at,token_id,tier,chain_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ claim: claim ?? null });
}
