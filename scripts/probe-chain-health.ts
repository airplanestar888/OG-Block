/**
 * Probe: which Alchemy NFT v3 hosts actually work with the configured key?
 * One cheap call per host. Decides whether per-chain failures can be treated
 * as fatal (strict scoring) or whether a host is permanently broken for this
 * plan and should not be queried at all.
 */

import "dotenv/config";
import { env } from "@/lib/env";

const HOSTS = [
  "base-mainnet.g.alchemy.com",
  "eth-mainnet.g.alchemy.com",
  "robinhood-mainnet.g.alchemy.com"
];

async function main() {
  const wallet = process.argv[2] || "0x502ce9fb1814cb03843967ec5e0d8f6aa3a3c2e1";
  for (const host of HOSTS) {
    const url = new URL(`https://${host}/nft/v3/${env.NFT_PROVIDER_API_KEY}/getNFTsForOwner`);
    url.searchParams.set("owner", wallet);
    url.searchParams.set("pageSize", "1");
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const body = await res.text().catch(() => "");
      console.log(`${host}: HTTP ${res.status} — ${body.slice(0, 140)}`);
    } catch (err) {
      console.log(`${host}: THREW — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
