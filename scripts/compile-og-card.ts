#!/usr/bin/env tsx
/**
 * Compile contracts/OgCard.sol → contracts/OgCard.json (ABI + bytecode + metadata)
 * Resolves @openzeppelin/* imports from node_modules via solc import callback.
 * Run: npx tsx scripts/compile-og-card.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const contractPath = join(ROOT, "contracts/OgCard.sol");
const outputPath = join(ROOT, "contracts/OgCard.json");

// solc import callback — resolve any import path from node_modules
function findImports(importPath: string): { contents: string } | { error: string } {
  try {
    const resolved = join(ROOT, "node_modules", importPath);
    return { contents: readFileSync(resolved, "utf-8") };
  } catch {
    return { error: `File not found: ${importPath}` };
  }
}

async function main() {
  const solc: any = await import("solc").then((m: any) => m.default ?? m);

  const source = readFileSync(contractPath, "utf-8");

  const input = {
    language: "Solidity",
    sources: {
      "OgCard.sol": { content: source }
    },
    settings: {
      outputSelection: { "*": { "*": ["abi", "evm.bytecode", "metadata"] } },
      optimizer: { enabled: true, runs: 200 },
      // embed full source in metadata so Basescan standard-json verification works
      metadata: { useLiteralContent: true }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const fatal = output.errors.filter((e: { severity: string }) => e.severity === "error");
    if (fatal.length > 0) {
      console.error("Compile errors:");
      fatal.forEach((e: { formattedMessage: string }) => console.error(e.formattedMessage));
      process.exit(1);
    }
    // surface warnings but don't fail
    output.errors.forEach((e: { formattedMessage: string }) => console.warn(e.formattedMessage));
  }

  const contract = output.contracts["OgCard.sol"]["OgCard"];
  if (!contract) {
    console.error("Contract not found in output");
    process.exit(1);
  }

  const artifact = {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
    // metadata is the exact solc standard-json used for source verification
    metadata: contract.metadata,
    compiler: solc.version()
  };

  mkdirSync(join(ROOT, "contracts"), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
  console.log(`✓ Written to ${outputPath}`);
  console.log(`  Compiler: ${artifact.compiler}`);
  console.log(`  ABI: ${artifact.abi.length} entries`);
  console.log(`  Bytecode: ${artifact.bytecode.length / 2} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
