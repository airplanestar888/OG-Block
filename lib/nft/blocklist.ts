import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const DEFAULT_BLOCKED_CONTRACTS = [
  "0x27b43b897ff89a1c9999e317304e756133beb105"
];

const DEFAULT_BLOCKED_CREATORS = [
  "0x43831ccd4d1ade29e185b249c356cf5367350ce2"
];

export type NftBlocklist = {
  contracts: Set<string>;
  creators: Set<string>;
};

let cachedBlocklist: NftBlocklist | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getNftBlocklist(): Promise<NftBlocklist> {
  const now = Date.now();
  if (cachedBlocklist && now - cachedAt < CACHE_TTL_MS) return cachedBlocklist;

  const contracts = new Set<string>([
    ...DEFAULT_BLOCKED_CONTRACTS,
    ...env.NFT_BLOCKLIST_CONTRACTS
  ].map((value) => value.toLowerCase()));

  const creators = new Set<string>([
    ...DEFAULT_BLOCKED_CREATORS,
    ...env.NFT_BLOCKLIST_CREATORS
  ].map((value) => value.toLowerCase()));

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("nft_blocklist").select("kind, value");
    if (!error && data) {
      for (const row of data) {
        const value = String(row.value || "").toLowerCase();
        if (!value) continue;
        if (row.kind === "contract") contracts.add(value);
        else if (row.kind === "creator") creators.add(value);
      }
    }
  } catch {
    // Fall back to defaults + env vars if the blocklist table is unreachable.
  }

  cachedBlocklist = { contracts, creators };
  cachedAt = now;
  return cachedBlocklist;
}
