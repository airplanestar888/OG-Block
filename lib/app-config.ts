import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/// Runtime-editable app config. Values live in the Supabase `app_config` table
/// (key/value) and can be edited from the admin portal without redeploying.
/// Env vars act as the initial fallback when a key is not set in the DB.

export const OG_CARD_CONTRACT_KEY = "og_card_contract";
export const OG_CARD_CHAIN_ID_KEY = "og_card_chain_id";
export const OG_NFT_IMAGE_URL_KEY = "og_nft_image_url";
export const OG_CARD_IMAGE_URL_KEY = "og_card_image_url";

export type OgCardConfig = {
  contractAddress: string | null;
  chainId: number;
};

export type AppImagesConfig = {
  nftImageUrl: string;
  cardImageUrl: string;
};

/// Read multiple config keys at once. Returns a map of key → value (string) or null.
export async function getConfigValues(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) result[key] = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("app_config").select("key,value").in("key", keys);
    for (const row of data || []) {
      result[row.key] = row.value ?? null;
    }
  } catch {
    // table missing / DB unreachable → fall back to env only
  }

  return result;
}

/// Resolve the OG Card contract config, DB first then env fallback.
export async function getOgCardConfig(): Promise<OgCardConfig> {
  const values = await getConfigValues([
    OG_CARD_CONTRACT_KEY,
    OG_CARD_CHAIN_ID_KEY,
    OG_CARD_IMAGE_URL_KEY
  ]);

  const contractAddress =
    values[OG_CARD_CONTRACT_KEY] || env.NEXT_PUBLIC_OG_CARD_CONTRACT || null;

  const chainIdRaw = values[OG_CARD_CHAIN_ID_KEY];
  const chainId = chainIdRaw ? Number(chainIdRaw) : env.NEXT_PUBLIC_OG_CARD_CHAIN_ID;

  return { contractAddress, chainId };
}

/// Resolve dynamic images (Supabase Storage URL or fallback to local static assets).
export async function getAppImages(): Promise<AppImagesConfig> {
  const values = await getConfigValues([OG_NFT_IMAGE_URL_KEY, OG_CARD_IMAGE_URL_KEY]);

  return {
    nftImageUrl: values[OG_NFT_IMAGE_URL_KEY] || "/og-nft-grid.png",
    cardImageUrl: values[OG_CARD_IMAGE_URL_KEY] || "/og-card.png"
  };
}

/// Upsert a single config key. `updatedBy` is stored for audit.
export async function setConfigValue(key: string, value: string | null, updatedBy: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_config").upsert(
    { key, value, updated_by: updatedBy, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) throw error;
}

