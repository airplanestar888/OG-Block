/**
 * Probe: does the rank-1 wallet hold more NFTs than the provider's 5-page
 * (500-item) fetch cap? Read-only — walks getNFTsForOwner pages and reports
 * whether a pageKey still exists after page 5.
 */

import "dotenv/config";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const arg = process.argv[2];
if (!arg) throw new Error("Usage: tsx scripts/probe-holdings-pages.ts <wallet-address|@handle>");

async function resolveWallet() {
  if (arg.startsWith("0x")) return arg;
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("x_handle", arg.replace(/^@/, "").toLowerCase())
    .maybeSingle();
  const { data: wallets } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", user!.id)
    .in("wallet_slot", ["human", "agent"]);
  return (wallets || []).map((w) => w.address as string);
}

async function countPages(wallet: string) {
  const host = "base-mainnet.g.alchemy.com"; // Base only is enough to see if >500 exist there
  let pageKey: string | undefined;
  let total = 0;
  const perPage: number[] = [];

  for (let page = 1; page <= 12; page += 1) {
    const url = new URL(`https://${host}/nft/v3/${env.NFT_PROVIDER_API_KEY}/getNFTsForOwner`);
    url.searchParams.set("owner", wallet);
    url.searchParams.set("withMetadata", "false");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`page ${page} failed: ${res.status} ${await res.text().catch(() => "")}`);
    const body = (await res.json()) as { ownedNfts?: unknown[]; pageKey?: string };
    perPage.push(body.ownedNfts?.length || 0);
    total += body.ownedNfts?.length || 0;
    console.log(`page ${page}: ${body.ownedNfts?.length || 0} items (running total ${total})`);
    pageKey = body.pageKey;
    if (!pageKey) {
      console.log(`no more pages after page ${page}`);
      break;
    }
    if (page === 5) console.log(`--- engine's 5-page cap ends here; pageKey still present = MORE NFTs exist ---`);
  }
}

async function main() {
  const wallets = await resolveWallet();
  for (const wallet of Array.isArray(wallets) ? wallets : [wallets]) {
    console.log(`\n=== ${wallet} ===`);
    await countPages(wallet);
  }
}

main().catch((err) => {
  console.error("probe failed:", err);
  process.exit(1);
});
