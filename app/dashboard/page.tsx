import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateCurrentUser } from "@/lib/users";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WalletScorePanel } from "@/components/wallet-score-panel";
import { XAvatar } from "@/components/x-avatar";
import { PageHeading } from "@/components/page-heading";
import { getOgCardConfig } from "@/lib/app-config";
import { shortAddress } from "@/lib/address";
import { getHoldingScoreBreakdown } from "@/lib/display";
import { getUserScoreHistory } from "@/lib/public-profiles";
import { fetchAllUserHoldings } from "@/lib/holdings";
import { getContractRecords } from "@/lib/nft/contracts";
import type { NftHolding } from "@/lib/types";
import { DashboardPortfolioFilter, type DashboardHolding } from "@/components/dashboard-portfolio-filter";

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
      fetchAllUserHoldings(user.id),
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
    const contracts = await getContractRecords(addrs);
    contractMap = new Map(
      contracts.map((c) => [c.contract_address.toLowerCase(), { is_spam: c.is_spam, is_verified: c.is_verified }])
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

  const dashboardHoldings: DashboardHolding[] = (countedHoldings || []).map((holding, index) => {
    const metadata = holding.metadata_json as { creator?: unknown; attributes?: unknown[]; chain?: string } | null;
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
    const rawChain = metadata?.chain;
    const chain: "Base" | "Ethereum" | "Robinhood" | "Solana" =
      rawChain === "Ethereum" || rawChain === "Robinhood" || rawChain === "Solana"
        ? rawChain
        : "Base";

    return {
      contractAddress: holding.contract_address,
      tokenId: holding.token_id,
      chain,
      creatorLabel: creator.label,
      creatorAddress: creator.address,
      traits: traits || "Standard",
      scoreTotal: scoreBreakdown.total,
      scoreParts: scoreBreakdown.parts,
      explorerUrl
    };
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-5 py-12 text-ink">
      {/* Roadmap-style backdrop — blue glow + hairline grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        {/* ── Hero: identity + culture score in one breath ── */}
        <section className="relative overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(10,11,13,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-7 md:px-9 md:pt-8">
            <div className="flex items-center gap-4">
              <XAvatar src={user.x_avatar} handle={user.x_handle} size={64} />
              <div className="min-w-0">
                <p className="truncate text-sm text-black/50">@{user.x_handle}</p>
                <p className="truncate text-base font-semibold leading-tight text-ink md:text-xl">
                  {user.x_name || user.x_handle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border border-baseblue/20 bg-baseblue/10 px-3 py-1.5">
              <span className="size-2 rounded-full bg-baseblue" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-baseblue">
                {score?.rank ? `Rank #${score.rank}` : "Unranked"}
              </p>
            </div>
          </div>

          <div className="px-6 pb-2 pt-5 md:px-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Dashboard</p>
            <PageHeading className="mt-2" outline="Your rank, live.">
              Your culture score.
            </PageHeading>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-black/[0.07] px-6 py-6 md:px-9 md:py-7">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-black/40">
                Culture score
              </p>
              <p className="mt-1 text-5xl font-bold leading-none tracking-tight text-ink md:text-7xl">
                {(score?.score ?? 0).toLocaleString()}
              </p>
              <p className="mt-3 text-xs text-black/65">
                {score?.last_calculated_at
                  ? `Last refreshed ${formatUtcDate(score.last_calculated_at)}`
                  : "Verify your wallet to generate your combined score."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-black/40">Status</p>
              <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-ink md:text-4xl">
                {ogClaim?.tier ? (
                  ogClaim.tier
                ) : score?.is_og ? (
                  "OG"
                ) : (
                  <span className="text-black/30">Member</span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px border-t border-black/[0.07] bg-black/[0.07]">
            <HeroStat label="NFTs counted" value={score?.nft_count ?? 0} />
            <HeroStat label="Badges" value={badgeCount} />
            <HeroStat label="Rank" value={score?.rank ? `#${score.rank}` : "—"} />
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
            title="Let your agent hold & score"
            description="Virtual Protocol agent wallet. Its NFTs also accumulate into the same OG score."
            verifiedWallet={agentWallet?.address}
            allowBrowserConnect={false}
            accent="green"
          />
        </div>

        {/* Badges & Perks — thin banner when empty, full card when claimed */}
        {!ogClaim ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-baseblue/20 bg-baseblue/[0.05] px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-baseblue/10 text-baseblue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 21h8M12 17.5V21M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 6H4.2a2.8 2.8 0 0 0 3.1 3.6M17 6h2.8a2.8 2.8 0 0 1-3.1 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">No badge yet — claim your Official OG Badge NFT.</p>
                <p className="text-xs text-black/55">Collection NFTs stay in Blockchain Legacy below.</p>
              </div>
            </div>
            <Link className="btn-primary" href="/og-card">
              Claim Badge/NFT
            </Link>
          </section>
        ) : (
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_8px_rgba(0,0,0,0.035)] md:p-8">
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Badges &amp; perks</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">
                OG Card claimed.
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/60">
                Your Official OG Badge is minted on Base. More perks unlock over time.
              </p>
            </div>
            <div className="rounded-xl border border-baseblue/20 bg-baseblue/10 px-6 py-4 text-center md:col-start-2 md:row-start-1">
              <p className="text-3xl font-semibold text-ink">{badgeCount}</p>
              <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-baseblue">Badges</p>
            </div>
          </div>

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
                  className="btn-secondary h-9 px-4 text-xs"
                  href={getOgCardExplorerUrl(ogClaim.chain_id, ogCardConfig?.contractAddress ?? null, ogClaim.token_id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  BaseScan
                </Link>
              </div>
            ) : null}
          </div>
        </section>
        )}

        {/* Blockchain Legacy — verified collection receipts */}
        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_8px_rgba(0,0,0,0.035)] md:p-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">
              Blockchain Legacy · {score?.nft_count ?? 0} verified NFTs
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Verified collection receipts</h2>
            <p className="mt-1 text-sm text-black/55">
              Only verified contracts appear here.
            </p>
          </div>

          <div className="mt-6">
            <DashboardPortfolioFilter holdings={dashboardHoldings} />
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
