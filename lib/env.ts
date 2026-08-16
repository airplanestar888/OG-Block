import { z } from "zod";

function parseList(value: unknown): string[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const serverEnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NFT_PROVIDER: z.enum(["alchemy", "simplehash", "reservoir", "rpc", "mock"]).default("mock"),
  NFT_PROVIDER_API_KEY: z.string().optional(),
  NFT_EXCLUDE_SPAM: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  NFT_REQUIRE_VERIFIED_CONTRACT: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  NFT_MIN_FLOOR_PRICE_ETH: z.coerce.number().min(0).default(0),
  NFT_BLOCKLIST_CONTRACTS: z.preprocess(parseList, z.array(z.string()).default([])),
  NFT_BLOCKLIST_CREATORS: z.preprocess(parseList, z.array(z.string()).default([])),
  BASESCAN_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  CRON_REFRESH_LIMIT: z.coerce.number().int().positive().default(50),
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  TARGET_NFT_CONTRACT_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_OG_CARD_CONTRACT: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_OG_CARD_CHAIN_ID: z.coerce.number().int().default(8453),
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().optional(),
  ADMIN_X_HANDLES: z.preprocess(parseList, z.array(z.string()).default([]))
});

export const env = serverEnvSchema.parse(process.env);

export function assertServerEnv() {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.map(([key]) => key).join(", ")}`);
  }
}
