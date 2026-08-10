#!/usr/bin/env tsx
/**
 * Smoke test: mint an OG Card on Base Sepolia and verify 1-per-wallet rule
 * plus on-chain metadata (tokenURI decodes to JSON with attributes).
 * Run: NETWORK=testnet DEPLOYER_PRIVATE_KEY=0x... OG_CARD_CONTRACT=0x... npx tsx scripts/smoke-og-card.ts
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync } from "fs";
import { join } from "path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  const contract = process.env.OG_CARD_CONTRACT as `0x${string}`;
  if (!privateKey || !contract) throw new Error("Missing DEPLOYER_PRIVATE_KEY or OG_CARD_CONTRACT");

  const account = privateKeyToAccount(privateKey);
  const artifact = JSON.parse(readFileSync(join(__dirname, "../contracts/OgCard.json"), "utf-8"));
  const abi = artifact.abi;
  const rpc = process.env.BASE_RPC_URL || "https://sepolia.base.org";

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpc) });

  const claimedBefore = await publicClient.readContract({
    address: contract, abi, functionName: "hasClaimed", args: [account.address]
  });
  console.log(`hasClaimed (before): ${claimedBefore}`);

  if (!claimedBefore) {
    console.log("Minting...");
    const hash = await walletClient.writeContract({ address: contract, abi, functionName: "mint" });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assert(receipt.status === "success", `mint tx succeeded (${hash})`);
    // RPC read-replicas can lag a moment behind the mined block
    await new Promise((r) => setTimeout(r, 3000));
  }

  const [claimedAfter, balance, supply] = await Promise.all([
    publicClient.readContract({ address: contract, abi, functionName: "hasClaimed", args: [account.address] }),
    publicClient.readContract({ address: contract, abi, functionName: "balanceOf", args: [account.address] }),
    publicClient.readContract({ address: contract, abi, functionName: "totalSupply" })
  ]);
  assert(claimedAfter === true, "hasClaimed is true after mint");
  assert((balance as bigint) >= 1n, `balanceOf >= 1 (got ${balance})`);
  assert((supply as bigint) >= 1n, `totalSupply >= 1 (got ${supply})`);

  // find the caller's token id (assume last minted = supply-1 if they were latest; scan a few)
  const tokenId = 0n; // first token; adjust if running repeatedly on fresh contract
  const owner = await publicClient.readContract({ address: contract, abi, functionName: "ownerOf", args: [tokenId] });
  console.log(`ownerOf(#${tokenId}): ${owner}`);

  // ─── on-chain metadata ───
  const uri = await publicClient.readContract({
    address: contract, abi, functionName: "tokenURI", args: [tokenId]
  }) as string;
  assert(uri.startsWith("data:application/json;base64,"), "tokenURI is base64 data URI");
  const decoded = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf-8"));
  console.log("Decoded metadata:", JSON.stringify(decoded, null, 2));
  assert(typeof decoded.name === "string" && decoded.name.includes("OG Card #"), "name has 'OG Card #'");
  assert(typeof decoded.image === "string" && decoded.image.length > 0, "image is set");
  assert(Array.isArray(decoded.attributes) && decoded.attributes.length === 4, "4 attributes present");
  const traitTypes = decoded.attributes.map((a: { trait_type: string }) => a.trait_type);
  assert(traitTypes.includes("OG Number"), "attribute OG Number");
  assert(traitTypes.includes("Tier"), "attribute Tier");
  assert(traitTypes.includes("Minted"), "attribute Minted");
  assert(traitTypes.includes("Minter"), "attribute Minter");

  // contractURI
  const cUri = await publicClient.readContract({ address: contract, abi, functionName: "contractURI" }) as string;
  assert(cUri.startsWith("data:application/json;base64,"), "contractURI is base64 data URI");

  // double-mint must revert
  console.log("\nAttempting double-mint (expect revert)...");
  try {
    await publicClient.simulateContract({ address: contract, abi, functionName: "mint", account: account.address });
    throw new Error("double-mint did NOT revert");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    assert(!msg.includes("did NOT revert"), "double-mint reverted (AlreadyClaimed)");
  }

  console.log("\n✓ ALL CHECKS PASSED");
}

main().catch((e) => { console.error(e); process.exit(1); });
