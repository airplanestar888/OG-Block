import { z } from "zod";

const serverEnvSchema = z.object({
  NEXTAUTH_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NFT_PROVIDER: z.enum(["alchemy", "simplehash", "reservoir", "rpc", "mock"]).default("mock"),
  NFT_PROVIDER_API_KEY: z.string().optional(),
  NFT_EXCLUDE_SPAM: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  NFT_REQUIRE_VERIFIED_CONTRACT: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  NFT_MIN_FLOOR_PRICE_ETH: z.coerce.number().min(0).default(0),
  BASESCAN_API_KEY: z.string().optional(),
  BASE_RPC_URL: z.string().url().default("https://mainnet.base.org"),
  TARGET_NFT_CONTRACT_ADDRESS: z.string().default("0x0000000000000000000000000000000000000000"),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
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
