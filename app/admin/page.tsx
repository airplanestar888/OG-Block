import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateCurrentUser } from "@/lib/users";
import { isAdminUser } from "@/lib/admin";
import {
  getConfigValues,
  OG_CARD_CONTRACT_KEY,
  OG_CARD_CHAIN_ID_KEY,
  OG_NFT_IMAGE_URL_KEY,
  OG_CARD_IMAGE_URL_KEY
} from "@/lib/app-config";
import { env } from "@/lib/env";
import { AdminConfigForm } from "./config-form";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminUser(user)) redirect("/dashboard");

  const values = await getConfigValues([
    OG_CARD_CONTRACT_KEY,
    OG_CARD_CHAIN_ID_KEY,
    OG_NFT_IMAGE_URL_KEY,
    OG_CARD_IMAGE_URL_KEY
  ]);
  const contractAddress = values[OG_CARD_CONTRACT_KEY] || env.NEXT_PUBLIC_OG_CARD_CONTRACT || "";
  const chainId = values[OG_CARD_CHAIN_ID_KEY]
    ? Number(values[OG_CARD_CHAIN_ID_KEY])
    : env.NEXT_PUBLIC_OG_CARD_CHAIN_ID;
  const nftImageUrl = values[OG_NFT_IMAGE_URL_KEY] || "";
  const cardImageUrl = values[OG_CARD_IMAGE_URL_KEY] || "";

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0000FF]">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">App settings</h1>
        <p className="mt-2 text-sm leading-6 text-black/55">
          Signed in as @{user.x_handle}. Changes save to the Supabase database and take effect immediately — no redeploy.
        </p>
      </div>

      <AdminConfigForm
        initialContract={contractAddress}
        initialChainId={chainId}
        dbContract={values[OG_CARD_CONTRACT_KEY]}
        dbChain={values[OG_CARD_CHAIN_ID_KEY]}
        initialNftImage={nftImageUrl}
        initialCardImage={cardImageUrl}
        dbNftImage={values[OG_NFT_IMAGE_URL_KEY]}
        dbCardImage={values[OG_CARD_IMAGE_URL_KEY]}
      />
    </main>
  );
}
