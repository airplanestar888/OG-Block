import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateScoreForWallets, persistScore, resetScore } from "@/lib/scoring";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateCurrentUser } from "@/lib/users";

const walletDisconnectSchema = z.object({
  walletSlot: z.enum(["human", "agent"])
});

export async function POST(request: NextRequest) {
  const user = await getOrCreateCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = walletDisconnectSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid wallet disconnect payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { walletSlot } = payload.data;
  const { error: deleteError } = await supabase
    .from("wallets")
    .delete()
    .eq("user_id", user.id)
    .eq("wallet_slot", walletSlot);

  if (deleteError) throw deleteError;

  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("address,wallet_slot")
    .eq("user_id", user.id)
    .in("wallet_slot", ["human", "agent"]);

  if (walletsError) throw walletsError;

  const walletAddresses = (wallets || []).map((wallet) => wallet.address).filter(Boolean);
  if (walletAddresses.length === 0) {
    await resetScore(user.id);
    return NextResponse.json({
      score: 0,
      isOg: false,
      nftCount: 0,
      wallets: []
    });
  }

  const result = await calculateScoreForWallets(user.id, walletAddresses);
  await persistScore(user.id, result);

  return NextResponse.json({
    score: result.score,
    isOg: result.isOg,
    nftCount: result.nftCount,
    wallets: wallets || []
  });
}
