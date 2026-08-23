import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WalletScorePanel } from "@/components/wallet-score-panel";
import { XAvatar } from "@/components/x-avatar";
import { getOgCardConfig } from "@/lib/app-config";
import { shortAddress } from "@/lib/address";
import { getHoldingScoreBreakdown } from "@/lib/display";
import { getUserScoreHistory } from "@/lib/public-profiles";
import type { NftHolding } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await getOrCreateCurrentUser();
  if (!user) redirect("/login");

  const supabase = getSupabaseAdmin();
  let wallets: Array<{ address: string; verified_at: string | null; wallet_slot: string }> | null = null;
  let score: { score: number; rank: number | null; is_og: boolean; nft_count: number; last_calculated_at: string | null } | null = null;
  let holdings: Array<{ contract_address: string; token_id: string; metadata_json: unknown }> | null = null;
  let ogClaim: { wallet_address: string; token_id: string | null; tier: string | null; chain_id: number | null; claimed_at: string } | null = null;
  let userHistory: Awaited<ReturnType<typeof getUserScoreHistory>> = [];

  try {
    [wallets, score, holdings, ogClaim, userHistory] = await Promise.all([
      supabase
        .from("wallets")
        .select("address,verified_at,wallet_slot")
        .eq("user_id", user.id)
        .in("wallet_slot", ["human", "agent"])
        .then((r) => r.data ?? []),
      supabase
        .from("scores")
        .select("score,rank,is_og,nft_count,last_calculated_at")
        .eq("user_id", user.id)
        .maybeSingle()
        .then((r) => r.data ?? null),
      supabase
        .from("nft_holdings")
        .select("contract_address,token_id,metadata_json")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .then((r) => r.data ?? []),
      supabase
        .from("og_card_claims")
        .select("wallet_address,token_id,tier,chain_id,claimed_at")
        .eq("user_id", user.id)
        .limit(1)
        .then((r) => r.data?.[0] ?? null),
      getUserScoreHistory(user.id, 15).catch(() => [])
    ]);
  } catch {
    // If all queries fail, the error.tsx boundary will render.
    throw new Error("Failed to load dashboard data");
  }


  const humanWallet = (wallets || []).find((wallet) => wallet.wallet_slot === "human");
  const agentWallet = (wallets || []).find((wallet) => wallet.wallet_slot === "agent");
  const badgeCount = ogClaim ? 1 : 0;
  const ogCardConfig = ogClaim ? await getOgCardConfig() : null;

  // --- Blockchain Legacy: only NFTs whose contract counts toward the score ---
  // Spam / unverified contracts are shown on the public profile, not here.
  // This keeps Items / NFTs / Rank in sync (e.g. airplanestar_ 1 not 7).
  let contractMap: Map<string, { is_spam: boolean | null; is_verified: boolean | null }> | null = null;
  if (holdings && holdings.length > 0) {
    const addrs = [...new Set(holdings.map((h) => (h.contract_address as string).toLowerCase()))];
    const { data: contracts } = await supabase
      .from("nft_contracts")
      .select("contract_address,is_spam,is_verified")
      .in("contract_address", addrs);
    contractMap = new Map(
      (contracts || []).map((c) => [(c.contract_address as string).toLowerCase(), c as { is_spam: boolean | null; is_verified: boolean | null }])
    );
  }
  // Legacy: strictly verified contracts only (spam and pending stay on the
  // public profile's breakdown, not here — keeps Items in sync with rank).
  function isVerifiedForLegacy(c: { is_verified: boolean | null } | undefined): boolean {
    return c?.is_verified === true;
  }
  const countedHoldings = contractMap
    ? (holdings || []).filter((h) => isVerifiedForLegacy(contractMap!.get((h.contract_address as string).toLowerCase())))
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-5 py-12 text-ink">
      {/* Roadmap-style backdrop — blue glow + hairline grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        {/* Profile header */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <XAvatar src={user.x_avatar} handle={user.x_handle} size={64} />
            <div>
              <p className="text-sm text-black/50">@{user.x_handle}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">{user.x_name || user.x_handle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-baseblue/20 bg-baseblue/10 px-3 py-1.5">
            <span className="size-2 rounded-full bg-baseblue" />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-baseblue">
              {score?.rank ? `Rank #${score.rank}` : "Unranked"}
            </p>
          </div>
        </section>

        {/* Culture score — roadmap-style flat card with hairline stat grid */}
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-black/10">
          <div className="bg-[#f0f1f3] p-6 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Culture score</p>
                <p className="mt-2 text-6xl font-bold leading-none tracking-tight text-ink md:text-7xl">
                  {(score?.score ?? 0).toLocaleString()}
                </p>
                <p className="mt-3 text-xs text-black/65">
                  {score?.last_calculated_at
                    ? `Last refreshed ${formatUtcDate(score.last_calculated_at)}`
                    : "Verify your wallet to generate your combined score."}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px bg-black/10">
            <HeroStat label="NFTs counted" value={score?.nft_count ?? 0} />
            <HeroStat label="Badges" value={badgeCount} />
            <HeroStat label="Status" value={ogClaim?.tier ? ogClaim.tier : score?.is_og ? "OG" : "Member"} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <WalletScorePanel
            xUserId={user.x_user_id}
            xHandle={user.x_handle}
            xName={user.x_name}
            xAvatar={user.x_avatar}
            walletSlot="human"
            title="Wallet"
            description="Your main holder wallet. Its NFTs accumulate into the OG score."
            verifiedWallet={humanWallet?.address}
          />
          <WalletScorePanel
            xUserId={user.x_user_id}
            xHandle={user.x_handle}
            xName={user.x_name}
            xAvatar={user.x_avatar}
            walletSlot="agent"
            title="Agent Wallet"
            description="Virtual Protocol agent wallet. Its NFTs also accumulate into the same OG score."
            verifiedWallet={agentWallet?.address}
            allowBrowserConnect={false}
          />
        </div>

        {/* Badges & Perks — roadmap-style flat card */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_8px_rgba(0,0,0,0.035)] md:p-8">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Badges &amp; perks</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">
                {ogClaim ? "OG Card claimed." : "OG BLOCK badge field is ready."}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/60">
                {ogClaim
                  ? "Your Official OG Badge is minted on Base. More perks unlock over time."
                  : "Claim your Official OG Badge NFT to fill this field. Collection NFTs stay in Blockchain Legacy below."}
              </p>
            </div>
            <div className="rounded-xl border border-baseblue/20 bg-baseblue/10 px-6 py-4 text-center md:col-start-2 md:row-start-1">
              <p className="text-3xl font-semibold text-ink">{badgeCount}</p>
              <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-baseblue">Badges</p>
            </div>
            {!ogClaim ? (
              <Link
                className="focus-ring inline-flex self-start rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#141CB5] md:col-start-1 md:row-start-2 md:justify-self-start"
                href="/og-card"
              >
                Claim OG Card
              </Link>
            ) : null}
          </div>

          {ogClaim ? (
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-black/10 bg-white p-4">
              <Image
                className="rounded-lg object-cover"
                src="/api/og-card/image"
                alt="OG Card"
                width={72}
                height={72}
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  OG Card{ogClaim.token_id ? ` #${ogClaim.token_id}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {ogClaim.tier ? (
                    <span className="rounded-full bg-baseblue/10 px-2.5 py-1 font-bold uppercase tracking-[0.08em] text-baseblue">
                      {ogClaim.tier}
                    </span>
                  ) : null}
                  <span className="font-mono text-black/50">{shortAddress(ogClaim.wallet_address)}</span>
                </div>
              </div>
              {ogClaim.token_id && ogClaim.chain_id ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="rounded-md border border-black/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/70 transition hover:border-baseblue hover:text-baseblue"
                    href={getOgCardExplorerUrl(ogClaim.chain_id, ogCardConfig?.contractAddress ?? null, ogClaim.token_id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    BaseScan
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Blockchain Legacy — roadmap-style flat receipt card */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_8px_rgba(0,0,0,0.035)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Blockchain Legacy</h2>
              <p className="mt-1 text-sm text-black/55">
                Verified collection receipts — only verified contracts appear here.
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 text-center text-xs sm:w-auto sm:max-w-xs">
              <ReceiptStat label="Items" value={score?.nft_count ?? (holdings || []).length} />
              <ReceiptStat label="Score" value={score?.score ?? 0} />
              <ReceiptStat label="Rank" value={score?.rank ? `#${score.rank}` : "-"} />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {(countedHoldings || []).map((holding, index) => {
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
              const creator = getCreatorDisplay(metadata?.creator);
              const explorerUrl = getBaseExplorerNftUrl(holding.contract_address, holding.token_id);

              return (
                <article key={`${holding.contract_address}-${holding.token_id}`} className="grid gap-4 rounded-xl border border-black/10 bg-white p-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-black px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                        Item {index + 1}
                      </span>
                      {creator.label !== "Unknown creator" ? (
                        creator.address ? (
                          <Link
                            className="font-semibold text-ink hover:text-baseblue"
                            href={`https://basescan.org/address/${creator.address}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Creator: {creator.label}
                          </Link>
                        ) : (
                          <h3 className="font-semibold text-ink">Creator: {creator.label}</h3>
                        )
                      ) : null}
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <ReceiptLine label="Collection contract" value={shortAddress(holding.contract_address) || "-"} mono />
                      <ReceiptLine label="Token ID" value={holding.token_id} />
                      <ReceiptLine label="Traits" value={traits || "No trait metadata"} />
                    </dl>
                    <Link
                      className="mt-4 inline-flex rounded-md border border-black/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/70 transition hover:border-baseblue hover:text-baseblue"
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Show onchain
                    </Link>
                  </div>

                  <div className="min-w-52 rounded-xl border border-black/10 bg-[#fbfcff] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-baseblue">Score impact</p>
                    <p className="mt-2 text-3xl font-semibold text-black">+{scoreBreakdown.total}</p>
                    <div className="mt-3 space-y-1">
                      {scoreBreakdown.parts.map((part) => (
                        <div key={part.label} className="flex justify-between gap-3 text-xs text-black/60">
                          <span>{part.label}</span>
                          <span className="font-semibold text-black">+{part.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}

            {(countedHoldings || []).length === 0 ? (
              <div className="rounded-xl border border-black/10 bg-white px-4 py-10 text-center text-sm text-black/50">
                No verified collection receipts yet — verify a wallet holding NFTs from verified contracts.
              </div>
            ) : null}
          </div>
        </section>

        {/* Score History & NFT Activity — roadmap-style flat card */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_8px_rgba(0,0,0,0.035)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">Score History &amp; NFT Activity</h2>
              <p className="mt-1 text-sm text-black/55">
                Track of points earned and NFT balance changes over time.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-baseblue hover:underline"
            >
              <span>View Public Leaderboard</span>
              <span>-&gt;</span>
            </Link>
          </div>

          <details className="group mt-5">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold text-black/70 transition hover:bg-black/5 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">
                Show detail{userHistory.length > 0 ? ` (${userHistory.length})` : ""}
              </span>
              <span className="hidden group-open:inline">Hide detail</span>
              <span className="text-xs transition group-open:rotate-180" aria-hidden="true">▼</span>
            </summary>

            <div className="mt-5 divide-y divide-black/[0.08]">
              {userHistory.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[0.68rem] font-bold uppercase ${
                          item.eventType === "nft_added"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : item.eventType === "initial_score"
                            ? "bg-baseblue/10 text-baseblue"
                            : item.eventType === "wallet_disconnected"
                            ? "bg-rose-500/10 text-rose-700"
                            : "bg-black/[0.06] text-black/70"
                        }`}
                      >
                        {item.eventType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-black/40">{formatUtcDate(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-black/85">{item.reason}</p>
                    <p className="mt-0.5 text-xs text-black/50">
                      Previous: {item.oldScore} pts -&gt; New: <span className="font-bold text-ink">{item.newScore} pts</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.pointsDelta > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
                        <span>▲</span> +{item.pointsDelta} pts
                      </span>
                    ) : item.pointsDelta < 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700">
                        <span>▼</span> {item.pointsDelta} pts
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-black/60">
                        Score refreshed
                      </span>
                    )}

                    {item.nftDelta > 0 ? (
                      <span className="rounded-full bg-black/[0.05] px-2 py-1 text-xs font-bold text-black/70">
                        +{item.nftDelta} NFT
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}

              {userHistory.length === 0 ? (
                <div className="py-6 text-center text-sm text-black/50">
                  No score history recorded yet. Connect a wallet to start tracking points and NFT additions.
                </div>
              ) : null}
            </div>
          </details>
        </section>

      </div>
    </main>
  );
}

function getBaseExplorerNftUrl(contractAddress: string, tokenId: string) {  return `https://basescan.org/nft/${contractAddress}/${tokenId}`;
}

function getOgCardExplorerUrl(chainId: number, contractAddress: string | null, tokenId: string | null) {
  // Use Blockscout for the NFT instance view — it renders the token image
  // reliably (BaseScan is slow/flaky to crawl NFT metadata images).
  const blockscout = chainId === 84532 ? "https://base-sepolia.blockscout.com" : "https://base.blockscout.com";
  const basescan = chainId === 84532 ? "https://sepolia.basescan.org" : "https://basescan.org";
  if (contractAddress && tokenId) return `${blockscout}/token/${contractAddress}/instance/${tokenId}`;
  if (contractAddress) return `${basescan}/address/${contractAddress}`;
  return basescan;
}

function formatUtcDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white px-4 py-4 text-center">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-black/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-black/88">{value}</p>
    </div>
  );
}

function ReceiptStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/40">{label}</p>
      <p className="mt-1 font-semibold text-black/88">{value}</p>
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
      // Shorten any full 0x wallet address in a trait value so we don't expose
      // it in full on the public receipt (e.g. "Sender: 0x6c03…6815").
      const value = trait.value.replace(/0x[a-fA-F0-9]{40}/g, (addr) => `${addr.slice(0, 6)}…${addr.slice(-4)}`);
      return `${trait.trait_type}: ${value}`;
    })
    .filter(Boolean)
    .slice(0, 3)
    .join(" / ");
}

function getCreatorDisplay(creator: unknown): { label: string; address?: string } {
  if (typeof creator === "string") return { label: creator };
  if (Array.isArray(creator)) {
    const creators = creator
      .map((item) => {
        if (typeof item === "string") return { label: item };
        if (!item || typeof item !== "object") return null;
        const creatorItem = item as { name?: unknown; address?: unknown; username?: unknown };
        const address = typeof creatorItem.address === "string" ? creatorItem.address : undefined;
        if (typeof creatorItem.name === "string") return { label: creatorItem.name, address };
        if (typeof creatorItem.username === "string") return { label: creatorItem.username, address };
        if (address) return { label: shortAddress(address) || address, address };
        return null;
      })
      .filter((item): item is { label: string; address?: string } => Boolean(item));
    if (creators.length > 0) return creators[0];
  }
  if (creator && typeof creator === "object") {
    const creatorObject = creator as { name?: unknown; address?: unknown; username?: unknown };
    const address = typeof creatorObject.address === "string" ? creatorObject.address : undefined;
    if (typeof creatorObject.name === "string") return { label: creatorObject.name, address };
    if (typeof creatorObject.username === "string") return { label: creatorObject.username, address };
    if (address) return { label: shortAddress(address) || address, address };
  }
  return { label: "Unknown creator" };
}
