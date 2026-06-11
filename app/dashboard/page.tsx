import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WalletScorePanel } from "@/components/wallet-score-panel";
import { shortAddress } from "@/lib/address";
import { getHoldingScoreBreakdown } from "@/lib/display";
import type { NftHolding } from "@/lib/types";

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
            <h2 className="font-semibold text-ink">Blockchain Legacy</h2>
            <p className="mt-1 text-sm text-black/60">
              {score?.last_calculated_at ? `Last refreshed ${new Date(score.last_calculated_at).toLocaleString()}` : "Verify wallet to generate your receipt."}
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-black/10 text-center text-xs">
            <ReceiptStat label="Items" value={(holdings || []).length} />
            <ReceiptStat label="Score" value={score?.score ?? 0} />
            <ReceiptStat label="Rank" value={score?.rank ? `#${score.rank}` : "-"} />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {(holdings || []).map((holding, index) => {
            const metadata = holding.metadata_json as { creator?: unknown; attributes?: unknown[] } | null;
            const scoreBreakdown = getHoldingScoreBreakdown(
              {
                contractAddress: holding.contract_address,
                tokenId: holding.token_id,
                metadata: metadata || {}
              } satisfies NftHolding,
              index
            );
            const traits = getTraitSummary(metadata?.attributes);
            const creator = getCreatorSummary(metadata?.creator);
            const explorerUrl = getBaseExplorerNftUrl(holding.contract_address, holding.token_id);

            return (
              <article key={`${holding.contract_address}-${holding.token_id}`} className="grid gap-4 rounded-lg border border-dashed border-black/15 bg-[#fbfcff] p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-black px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                      Item {index + 1}
                    </span>
                    <h3 className="font-semibold text-ink">{creator || "Unknown creator"}</h3>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <ReceiptLine label="Collection contract" value={shortAddress(holding.contract_address) || "-"} mono />
                    <ReceiptLine label="Token ID" value={holding.token_id} />
                    <ReceiptLine label="Traits" value={traits || "No trait metadata"} />
                  </dl>
                  <Link
                    className="mt-4 inline-flex rounded-md border border-black/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/70 hover:border-baseblue hover:text-baseblue"
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Show onchain
                  </Link>
                </div>

                <div className="min-w-52 rounded-lg border border-black/10 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-baseblue">Score impact</p>
                  <p className="mt-2 text-3xl font-semibold text-black">+{scoreBreakdown.total}</p>
                  <div className="mt-3 space-y-1">
                    {scoreBreakdown.parts.map((part) => (
                      <div key={part.label} className="flex justify-between gap-3 text-xs text-black/62">
                        <span>{part.label}</span>
                        <span className="font-semibold text-black">+{part.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}

          {(holdings || []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 bg-[#fbfcff] px-4 py-8 text-center text-sm text-black/55">
              No collection receipt yet.
            </div>
          ) : null}
        </div>
      </section>

    </main>
  );
}

function getBaseExplorerNftUrl(contractAddress: string, tokenId: string) {
  return `https://basescan.org/nft/${contractAddress}/${tokenId}`;
}

function ReceiptStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-black/10 bg-black/[0.03] px-4 py-3 last:border-r-0">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/50">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReceiptLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">{label}</dt>
      <dd className={`mt-1 text-black/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function getTraitSummary(attributes: unknown) {
  if (!Array.isArray(attributes)) return "";

  return attributes
    .map((attribute) => {
      if (!attribute || typeof attribute !== "object") return "";
      const trait = attribute as { trait_type?: unknown; value?: unknown };
      if (typeof trait.trait_type !== "string" || typeof trait.value !== "string") return "";
      return `${trait.trait_type}: ${trait.value}`;
    })
    .filter(Boolean)
    .slice(0, 3)
    .join(" / ");
}

function getCreatorSummary(creator: unknown) {
  if (typeof creator === "string") return creator;
  if (Array.isArray(creator)) {
    return creator
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        const creatorItem = item as { name?: unknown; address?: unknown; username?: unknown };
        if (typeof creatorItem.name === "string") return creatorItem.name;
        if (typeof creatorItem.username === "string") return creatorItem.username;
        if (typeof creatorItem.address === "string") return shortAddress(creatorItem.address);
        return "";
      })
      .filter(Boolean)
      .slice(0, 2)
      .join(" / ");
  }
  if (creator && typeof creator === "object") {
    const creatorObject = creator as { name?: unknown; address?: unknown; username?: unknown };
    if (typeof creatorObject.name === "string") return creatorObject.name;
    if (typeof creatorObject.username === "string") return creatorObject.username;
    if (typeof creatorObject.address === "string") return shortAddress(creatorObject.address);
  }
  return "";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-black/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
