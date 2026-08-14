import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function resolveFile(relativePath: string): string {
  if (relativePath.startsWith("@openzeppelin/")) {
    return join(ROOT, "node_modules", relativePath);
  }
  return join(ROOT, "contracts", relativePath);
}

const seenFiles = new Set<string>();
const collectedCode: string[] = [];

function processFile(filePath: string) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (seenFiles.has(normalizedPath)) return;
  seenFiles.add(normalizedPath);

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const importMatch = line.match(/^import\s+[^'"]*['"]([^'"]+)['"];?/);
    if (importMatch) {
      const importTarget = importMatch[1];
      let resolvedTarget: string;
      if (importTarget.startsWith("./") || importTarget.startsWith("../")) {
        const dir = filePath.substring(0, Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")));
        resolvedTarget = join(dir, importTarget);
      } else {
        resolvedTarget = resolveFile(importTarget);
      }
      processFile(resolvedTarget);
    }
  }

  // Add file body without pragma/spdx/import
  const filteredLines = lines.filter(line => {
    if (line.startsWith("// SPDX-License-Identifier:")) return false;
    if (line.startsWith("pragma solidity")) return false;
    if (/^import\s+/.test(line)) return false;
    return true;
  });

  collectedCode.push(`// --- Start of ${normalizedPath} ---`);
  collectedCode.push(filteredLines.join("\n").trim());
  collectedCode.push(`// --- End of ${normalizedPath} ---\n`);
}

processFile(join(ROOT, "contracts", "OgCard.sol"));

const flattened = [
  "// SPDX-License-Identifier: MIT",
  "pragma solidity ^0.8.20;",
  "",
  ...collectedCode
].join("\n");

const outputPath = join(ROOT, "contracts", "OgCard_Flattened.sol");
writeFileSync(outputPath, flattened, "utf-8");
console.log(`✓ Generated flattened contract at ${outputPath}`);
