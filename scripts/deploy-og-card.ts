#!/usr/bin/env tsx
/**
 * Deploy OgCard contract to Base chain.
 *
 * env vars required:
 *   DEPLOYER_PRIVATE_KEY   – hex private key (with 0x prefix)
 *   BASE_RPC_URL           – Base RPC endpoint (default: https://mainnet.base.org)
 *
 * Run: npx tsx scripts/deploy-og-card.ts
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");

  // NETWORK=testnet → Base Sepolia, otherwise Base mainnet
  const isTestnet = process.env.NETWORK === "testnet";
  const chain = isTestnet ? baseSepolia : base;
  const defaultRpc = isTestnet ? "https://sepolia.base.org" : "https://mainnet.base.org";
  const rpcUrl = process.env.BASE_RPC_URL || defaultRpc;
  const explorer = isTestnet ? "https://sepolia.basescan.org" : "https://basescan.org";

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const artifact = JSON.parse(readFileSync(join(__dirname, "../contracts/OgCard.json"), "utf-8"));
  const bytecode = (`0x${artifact.bytecode}`) as `0x${string}`;

  // constructor arg: initial image URI (owner can change later via setImageURI)
  const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const imageURI = process.env.OG_CARD_IMAGE_URI || `${appUrl}/og-card.png`;

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Network:  ${chain.name} (${chain.id})`);
  console.log(`Deployer: ${account.address}`);
  console.log(`Balance:  ${balance} (${Number(balance) / 1e18} ETH)`);
  console.log(`Image:    ${imageURI}`);

  if (balance === 0n) throw new Error("Deployer has no ETH for gas");

  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode,
    args: [imageURI]
  });

  console.log(`Tx: ${explorer}/tx/${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) throw new Error("No contract address in receipt");

  console.log(`\n✓ Deployed at: ${receipt.contractAddress}`);
  console.log(`  ${explorer}/address/${receipt.contractAddress}`);
  console.log(`  Gas used: ${receipt.gasUsed}`);
  console.log(`\nAdd to .env.local:`);
  console.log(`  NEXT_PUBLIC_OG_CARD_CONTRACT=${receipt.contractAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
