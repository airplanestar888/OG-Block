#!/usr/bin/env tsx
/**
 * Update imageURI on the deployed OgCard smart contract.
 *
 * env vars required:
 *   DEPLOYER_PRIVATE_KEY   – hex private key of the contract owner (with 0x prefix)
 *   OG_CARD_CONTRACT       – contract address
 *   NEW_IMAGE_URI          – new image URL (e.g. https://og-block.vercel.app/api/og-card/image)
 *
 * Run: npx tsx scripts/set-contract-image-uri.ts
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { OgCardAbi } from "../lib/og-card-abi";

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY");

  const contractAddress = (process.env.OG_CARD_CONTRACT || "0xa46449f9799ae4afd76376074212f09e7825f857") as `0x${string}`;
  const newImageUri = process.env.NEW_IMAGE_URI || "https://og-block.vercel.app/api/og-card/image";

  const isTestnet = process.env.NETWORK !== "mainnet";
  const chain = isTestnet ? baseSepolia : base;
  const rpcUrl = isTestnet ? "https://sepolia.base.org" : "https://mainnet.base.org";
  const explorer = isTestnet ? "https://sepolia.basescan.org" : "https://basescan.org";

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log(`Updating imageURI on ${chain.name}...`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`New URI:  ${newImageUri}`);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: OgCardAbi,
    functionName: "setImageURI",
    args: [newImageUri]
  });

  console.log(`Tx submitted: ${explorer}/tx/${hash}`);
  console.log("Waiting for confirmation...");

  await publicClient.waitForTransactionReceipt({ hash });
  console.log("imageURI successfully updated on-chain!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
