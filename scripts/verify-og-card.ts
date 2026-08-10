#!/usr/bin/env tsx
/**
 * Verify the deployed OgCard contract source on Basescan (Etherscan v2 API).
 *
 * env vars:
 *   OG_CARD_CONTRACT    – deployed address (required)
 *   BASESCAN_API_KEY    – Etherscan/Basescan API key (required)
 *   NETWORK             – "testnet" for Base Sepolia, else Base mainnet
 *   OG_CARD_IMAGE_URI   – must match the imageURI used at deploy (for constructor args)
 *   PUBLIC_APP_URL      – fallback to build default image URI
 *
 * Run: NETWORK=testnet OG_CARD_CONTRACT=0x... BASESCAN_API_KEY=... npx tsx scripts/verify-og-card.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { encodeAbiParameters } from "viem";

async function main() {
  const address = process.env.OG_CARD_CONTRACT;
  const apiKey = process.env.BASESCAN_API_KEY;
  if (!address) throw new Error("Missing OG_CARD_CONTRACT");
  if (!apiKey) throw new Error("Missing BASESCAN_API_KEY");

  const isTestnet = process.env.NETWORK === "testnet";
  const chainId = isTestnet ? 84532 : 8453;

  const artifact = JSON.parse(readFileSync(join(__dirname, "../contracts/OgCard.json"), "utf-8"));

  // reconstruct the constructor arg (imageURI) exactly as deployed
  const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const imageURI = process.env.OG_CARD_IMAGE_URI || `${appUrl}/og-card.png`;
  const encodedArgs = encodeAbiParameters([{ type: "string" }], [imageURI]).slice(2);

  // compiler version string for Etherscan, e.g. v0.8.28+commit.7893614a
  const rawVersion: string = artifact.compiler; // "0.8.28+commit.7893614a.Emscripten.clang"
  const compilerVersion = `v${rawVersion.split(".Emscripten")[0]}`;

  // Etherscan v2 unified endpoint (works for Base via chainid param)
  const endpoint = "https://api.etherscan.io/v2/api";

  const params = new URLSearchParams({
    chainid: String(chainId),
    module: "contract",
    action: "verifysourcecode",
    apikey: apiKey,
    contractaddress: address,
    codeformat: "solidity-standard-json-input",
    contractname: "OgCard.sol:OgCard",
    compilerversion: compilerVersion,
    constructorArguements: encodedArgs
  });

  // The verified source input = the exact standard-json solc used.
  // artifact.metadata contains solc metadata; rebuild a standard-json input.
  const metadata = JSON.parse(artifact.metadata);
  const standardJson = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(metadata.sources).map(([path, src]: [string, any]) => [
        path,
        src.content ? { content: src.content } : { urls: src.urls }
      ])
    ),
    settings: {
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
      remappings: metadata.settings.remappings ?? [],
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }
    }
  };

  // if metadata.sources only have urls (no content), fall back to embedding files
  const needsContent = Object.values(standardJson.sources).some((s: any) => !("content" in s));
  if (needsContent) {
    console.warn("metadata.sources lacks inline content; embedding local files instead.");
    // rebuild from local files: main contract + resolve OZ imports on demand is complex,
    // so instruct the user to use the standard flow. For now, error clearly.
    throw new Error(
      "solc metadata did not inline sources. Re-run compile with metadata literal content, or verify manually on Basescan."
    );
  }

  params.append("sourceCode", JSON.stringify(standardJson));

  const res = await fetch(endpoint, { method: "POST", body: params });
  const data = await res.json();

  console.log("Response:", data);

  if (data.status === "1") {
    console.log(`\n✓ Submitted. GUID: ${data.result}`);
    console.log(`Check status: ${endpoint}?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${data.result}&apikey=***`);
  } else {
    console.error(`\n✗ Verification submission failed: ${data.result}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
