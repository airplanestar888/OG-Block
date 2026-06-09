import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WalletScorePanel } from "@/components/wallet-score-panel";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseAdmin();
  const [{ data: wallet }, { data: score }, { data: holdings }] = await Promise.all([
    supabase
      .from("wallets")
      .select("address,verified_at")
      .eq("user_id", user.id)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scores")
      .select("score,rank,is_og,nft_count,last_calculated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("nft_holdings")
      .select("contract_address,token_id,metadata_json")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.x_avatar ? (
            <Image className="rounded-full" src={user.x_avatar} alt="" width={64} height={64} />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-baseblue font-semibold text-white">
              {user.x_handle.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm text-black/60">@{user.x_handle}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">{user.x_name || user.x_handle}</h1>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Score" value={score?.score ?? 0} />
        <Stat label="Rank" value={score?.rank ? `#${score.rank}` : "Unranked"} />
        <Stat label="OG" value={score?.is_og ? "Yes" : "No"} />
        <Stat label="NFTs" value={score?.nft_count ?? 0} />
      </section>

      <WalletScorePanel xUserId={user.x_user_id} xHandle={user.x_handle} verifiedWallet={wallet?.address} />

      <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Owned collection NFTs</h2>
            <p className="mt-1 text-sm text-black/60">
              {score?.last_calculated_at ? `Last refreshed ${new Date(score.last_calculated_at).toLocaleString()}` : "Refresh score after wallet verification."}
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.03] text-black/60">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Token ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {(holdings || []).map((holding) => {
                const metadata = holding.metadata_json as { name?: string } | null;
                return (
                  <tr key={`${holding.contract_address}-${holding.token_id}`}>
                    <td className="px-4 py-3 font-mono text-xs">{holding.contract_address}</td>
                    <td className="px-4 py-3">{holding.token_id}</td>
                    <td className="px-4 py-3">{metadata?.name || "NFT"}</td>
                  </tr>
                );
              })}
              {(holdings || []).length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-black/55" colSpan={3}>
                    No holdings saved yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-black/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
