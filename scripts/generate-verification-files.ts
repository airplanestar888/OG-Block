#!/usr/bin/env tsx
/**
 * Generate standard JSON & verification artifacts for BaseScan / Etherscan verification.
 * Run: npx tsx scripts/generate-verification-files.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { encodeAbiParameters } from "viem";

const ROOT = join(__dirname, "..");
const artifactPath = join(ROOT, "contracts/OgCard.json");

function main() {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const metadata = JSON.parse(artifact.metadata);

  const standardJson = {
    language: "Solidity",
    sources: metadata.sources,
    settings: {
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }
    }
  };

  const standardJsonPath = join(ROOT, "contracts/OgCard_StandardJson.json");
  writeFileSync(standardJsonPath, JSON.stringify(standardJson, null, 2));

  const imageURI = "https://og-block.vercel.app/og-card.png";
  const encodedArgs = encodeAbiParameters([{ type: "string" }], [imageURI]).slice(2);

  console.log("=================================================");
  console.log("   BaseScan Contract Verification Info           ");
  console.log("=================================================");
  console.log(`Contract:              OgCard.sol:OgCard`);
  console.log(`Compiler Version:      v0.8.28+commit.7893614a (or version from artifact: ${artifact.compiler})`);
  console.log(`Optimization:          Enabled (200 runs)`);
  console.log(`Constructor Arguments: ${encodedArgs}`);
  console.log(`Standard JSON file:    contracts/OgCard_StandardJson.json`);
  console.log("=================================================\n");
}

main();
