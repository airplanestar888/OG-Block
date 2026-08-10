import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  getConfigValues,
  setConfigValue,
  OG_CARD_CONTRACT_KEY,
  OG_CARD_CHAIN_ID_KEY
} from "@/lib/app-config";
import { env } from "@/lib/env";

const updateSchema = z.object({
  contractAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address")
    .or(z.literal(""))
    .optional(),
  chainId: z.coerce.number().int().positive().optional()
});

export async function GET() {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const values = await getConfigValues([OG_CARD_CONTRACT_KEY, OG_CARD_CHAIN_ID_KEY]);

  return NextResponse.json({
    // effective values (DB override → env fallback) plus the raw DB values
    contractAddress: values[OG_CARD_CONTRACT_KEY] || env.NEXT_PUBLIC_OG_CARD_CONTRACT || "",
    chainId: values[OG_CARD_CHAIN_ID_KEY]
      ? Number(values[OG_CARD_CHAIN_ID_KEY])
      : env.NEXT_PUBLIC_OG_CARD_CHAIN_ID,
    source: {
      contractFromDb: values[OG_CARD_CONTRACT_KEY] !== null,
      chainFromDb: values[OG_CARD_CHAIN_ID_KEY] !== null
    }
  });
}

export async function POST(request: Request) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = `admin-config:${user.id}`;
  if (!rateLimit(key, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
  }

  const { contractAddress, chainId } = parsed.data;

  if (contractAddress !== undefined) {
    // empty string clears the DB override (falls back to env)
    await setConfigValue(
      OG_CARD_CONTRACT_KEY,
      contractAddress ? contractAddress.toLowerCase() : null,
      user.x_handle
    );
  }
  if (chainId !== undefined) {
    await setConfigValue(OG_CARD_CHAIN_ID_KEY, String(chainId), user.x_handle);
  }

  const values = await getConfigValues([OG_CARD_CONTRACT_KEY, OG_CARD_CHAIN_ID_KEY]);
  return NextResponse.json({
    contractAddress: values[OG_CARD_CONTRACT_KEY] || env.NEXT_PUBLIC_OG_CARD_CONTRACT || "",
    chainId: values[OG_CARD_CHAIN_ID_KEY]
      ? Number(values[OG_CARD_CHAIN_ID_KEY])
      : env.NEXT_PUBLIC_OG_CARD_CHAIN_ID
  });
}
