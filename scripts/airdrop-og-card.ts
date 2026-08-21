#!/usr/bin/env tsx
/**
 * Airdrop OG Card to every wallet that already claimed (migration from an old
 * deployment to a new one, e.g. testnet -> Base mainnet).
 *
 * Reads claimer wallets from Supabase `og_card_claims`, then calls the
 * owner-only `airdropMint(address)` on the NEW contract for each one — skipping
 * any wallet that already holds a card on the new contract (idempotent).
 * Every tx carries the Base builder attribution suffix, identical to UI mints.
 *
 * After a successful mint it updates that claim row in the DB with the new
 * chain_id + token_id + tier so profiles/leaderboard reflect the mainnet badge.
 *
 * env vars required:
 *   DEPLOYER_PRIVATE_KEY   – owner of the new contract (hex, 0x-prefixed)
 *   OG_CARD_CONTRACT       – new contract address on the target chain
 *   NETWORK                – "mainnet" (default) or "testnet"
 *   BASE_RPC_URL           – optional RPC override
 *   SUPABASE_*             – already in .env (service role) for DB reads/writes
 *
 * Run: npx tsx scripts/airdrop-og-card.ts
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http, getContract, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { OgCardAbi } from "@/lib/og-card-abi";

// Base builder attribution — same suffix the UI appends to mint calldata so
// airdrops are credited to our builder account (builder code bc_4va9iidy).
const BUILDER_DATA_SUFFIX =
  "0x62635f34766139696964790b0080218021802180218021802180218021" as `0x${string}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tierForTokenId(id: number): string {
  if (id < 100) return "Genesis";
  if (id < 500) return "Early";
  return "Member";
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");
  const contractAddress = process.env.OG_CARD_CONTRACT;
  if (!contractAddress) throw new Error("Missing OG_CARD_CONTRACT (new contract address)");

  const isTestnet = process.env.NETWORK === "testnet";
  const chain = isTestnet ? baseSepolia : base;
  const rpcUrl = process.env.BASE_RPC_URL || (isTestnet ? "https://sepolia.base.org" : "https://mainnet.base.org");
  const explorer = isTestnet ? "https://sepolia.basescan.org" : "https://basescan.org";

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log(`Network:  ${chain.name} (${chain.id})`);
  console.log(`Owner:    ${account.address}`);
  console.log(`Contract: ${contractAddress}`);

  const supabase = getSupabaseAdmin();
  const { data: claims, error } = await supabase
    .from("og_card_claims")
    .select("id,user_id,wallet_address,chain_id")
    .order("claimed_at", { ascending: true });
  if (error) throw error;

  // Distinct wallet addresses (lowercased).
  const seen = new Set<string>();
  const targets: Array<{ id: string; wallet: string }> = [];
  for (const c of claims || []) {
    const w = (c.wallet_address || "").toLowerCase();
    if (!w || seen.has(w)) continue;
    seen.add(w);
    targets.push({ id: c.id, wallet: w });
  }
  console.log(`\nClaimers to migrate: ${targets.length}\n`);

  const ogContract = getContract({ address: contractAddress as `0x${string}`, abi: OgCardAbi, client: publicClient });

  let minted = 0;
  let skipped = 0;
  const results: Array<{ wallet: string; status: string; tx?: string; tokenId?: string }> = [];

  for (const t of targets) {
    // Idempotent: skip wallets that already hold a card on the NEW contract.
    const already = (await ogContract.read.hasClaimed([t.wallet as `0x${string}`])) as boolean;
    if (already) {
      skipped += 1;
      results.push({ wallet: t.wallet, status: "already-has-card" });
      console.log(`• ${t.wallet} — already has a card, skip`);
      continue;
    }

    // tokenId that will be assigned = current totalSupply.
    const supplyBefore = (await ogContract.read.totalSupply([])) as bigint;
    const tokenId = Number(supplyBefore);

    const data = encodeFunctionData({ abi: OgCardAbi, functionName: "airdropMint", args: [t.wallet as `0x${string}`] });
    const hash = await walletClient.sendTransaction({
      to: contractAddress as `0x${string}`,
      data: (data + BUILDER_DATA_SUFFIX.slice(2)) as `0x${string}`
    });
    console.log(`→ ${t.wallet} airdrop tx: ${explorer}/tx/${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });

    const tier = tierForTokenId(tokenId);
    // Reflect the mainnet badge in DB so profiles/leaderboard match.
    await supabase
      .from("og_card_claims")
      .update({ chain_id: chain.id, token_id: String(tokenId), tier })
      .eq("id", t.id);

    minted += 1;
    results.push({ wallet: t.wallet, status: "minted", tx: hash, tokenId: String(tokenId) });
    console.log(`  ✓ minted #${tokenId} (${tier}) → ${t.wallet}`);
    await sleep(800);
  }

  console.log(`\nDONE. minted=${minted} skipped=${skipped} of ${targets.length}`);
  console.log(JSON.stringify(results, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
