import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/public-profiles";
import { PixelField } from "@/components/pixel-field";
import { PoweredBy } from "@/components/powered-by";

export default async function HomePage() {
  const session = await auth();
  const leaderboard = await getLeaderboard();
  const profiles = leaderboard.length;
  const totalScore = leaderboard.reduce((total, profile) => total + profile.score, 0);
  const totalNfts = leaderboard.reduce((total, profile) => total + profile.nftCount, 0);

  function formatCompactNumber(value: number): string {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (absValue >= 1_000) {
      return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return value.toLocaleString();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <PixelField />

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        className="page-container relative"
        style={{
          paddingTop:    "var(--hero-pt)",
          paddingBottom: "var(--hero-pb)",
        }}
      >
        <div className="hero-grid">

          {/* ── LEFT — copy ── */}
          <aside className="flex flex-col gap-6 sm:gap-7">

            {/* CTA Pill Banner — premium minting capsule */}
            <Link
              href="/og-card"
              className="focus-ring group relative inline-flex self-start overflow-hidden rounded-full p-px shadow-[0_10px_30px_rgba(0,0,255,0.35)] transition-transform duration-200 active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,0,255,0.9), rgba(91,140,255,0.9) 50%, rgba(20,28,181,0.9))",
              }}
            >
              <span className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#0000FF] via-[#141CB5] to-[#0000FF] px-4 py-2">
                <span className="grid size-5 place-items-center rounded-[6px] bg-white/15 text-[0.55rem] font-black leading-none text-white">
                  OG
                </span>
                <span className="text-xs font-semibold tracking-tight text-white">
                  Official OG Badge
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
                  </span>
                  Minting is Live
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
                  className="text-white/80 transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  <path
                    d="M2 7h10M8 3l4 4-4 4"
                    stroke="currentColor" strokeWidth="1.4"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </span>
              {/* shine sweep on hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.3)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full"
              />
            </Link>

            {/* Headline */}
            <div className="reveal reveal-d1 flex flex-col gap-3">
              <h1
                className="font-bebas leading-[0.94] text-[#0A0B0D]"
                style={{
                  fontSize:      "clamp(3.2rem, 6.58vw, 4.89rem)",
                  letterSpacing: "0.01em",
                }}
              >
                Own status.<br />
                Prove culture.
              </h1>
              <p
                className="text-[0.9rem] leading-[1.55] text-[#0A0B0D]/70 sm:text-[0.95rem]"
                style={{ letterSpacing: "-0.01em", maxWidth: "34ch" }}
              >
                Your NFT history becomes a score, rank, and proof of culture.
              </p>
            </div>

            {/* CTAs — pushed to the hero bottom on desktop, level with the Live capsule */}
            <div className="reveal reveal-d2 flex flex-wrap gap-2.5 sm:gap-3 lg:mt-auto">
              <Link href="/try" className="btn-primary">
                Try yours — no sign-in
              </Link>
              {session ? (
                <Link href="/og-card" className="btn-secondary">
                  Get your badge
                </Link>
              ) : (
                <Link href="/leaderboard" className="btn-secondary">
                  View leaderboard
                </Link>
              )}
            </div>
          </aside>

          {/* ── RIGHT — NFT image + score ── */}
          <div className="reveal reveal-d2 flex flex-col gap-2.5">

            {/* Image */}
            <div className="nft-image-wrap">
              <Image
                className="nft-img h-full w-full object-cover"
                src="/og-nft-grid.png"
                alt="OG BLOCK NFT collection"
                width={1776}
                height={864}
                priority
              />
            </div>

            {/* Score strip */}
            <div className="flex items-stretch overflow-hidden rounded-[14px] border border-[rgba(10,11,13,0.08)] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">

              {/* Label — hidden xs */}
              <div className="score-label-col flex items-center gap-2 border-r border-[rgba(10,11,13,0.07)] px-3 py-2.5 sm:px-4 sm:py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0000FF]" />
                <span className="whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#0A0B0D]/60 sm:text-[0.6rem]">
                  On Base
                </span>
              </div>

              {/* Metrics — live numbers from the leaderboard */}
              <div className="flex flex-1 divide-x divide-[rgba(10,11,13,0.07)]">
                <ScoreMetric label="Profiles" value={profiles.toLocaleString()} />
                <ScoreMetric label="Total score" value={formatCompactNumber(totalScore)} />
                <ScoreMetric label="NFTs" value={formatCompactNumber(totalNfts)} />
              </div>

              {/* Live — hidden xs */}
              <div className="score-live-col flex items-center gap-1.5 border-l border-[rgba(10,11,13,0.07)] px-3 sm:px-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00c48c]" />
                <span className="text-[0.58rem] font-semibold text-[#0A0B0D]/60 sm:text-[0.6rem]">Live</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── MULTI-CHAIN CULTURE INDEXING STRIP ───────── */}
        <div className="reveal reveal-d3 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(10,11,13,0.08)] bg-white/70 p-3.5 backdrop-blur-sm sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#00c48c]" />
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#0A0B0D]/55 sm:text-xs">
              Multi-Chain Culture Indexing
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[0.75rem] font-semibold text-[#0A0B0D]/75">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0000FF]/[0.08] px-2.5 py-1 text-[#0000FF]">
              <span className="size-1.5 rounded-full bg-[#0000FF]" /> Base
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#627EEA]" /> Ethereum
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#00C805]" /> Robinhood
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-[#9945FF]" /> Solana
            </span>
          </div>
        </div>
      </section>

      {/* ── POWERED BY ───────────────────────────────── */}
      <PoweredBy />

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="page-container relative pb-16 pt-2 sm:pb-20 sm:pt-4">
        <div className="reveal reveal-d3 border-t border-[rgba(10,11,13,0.08)]">
          {[
            { num: "01", title: "Membership",         copy: "Your NFTs become your identity" },
            { num: "02", title: "Culture Score",      copy: "Rank built from what you actually hold" },
            { num: "03", title: "Leaderboard",        copy: "Public proof of where you stand" },
            { num: "04", title: "X Visibility",       copy: "Your rank, live on every X profile" },
            { num: "05", title: "Agent Wallet Ready", copy: "Let your agent hold, score, and mint" },
          ].map(({ num, title, copy }) => (
            <div
              key={title}
              className="feature-row flex items-center justify-between gap-4 py-4 sm:gap-6 sm:py-5"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="w-6 shrink-0 text-[0.65rem] font-semibold tabular-nums text-[#0A0B0D]/45 sm:w-7 sm:text-[0.68rem]">
                  {num}
                </span>
                <div>
                  <p
                    className="text-[0.88rem] font-semibold text-[#0A0B0D] sm:text-[0.9rem]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-[#0A0B0D]/65 sm:text-[0.78rem]">{copy}</p>
                </div>
              </div>
              <svg
                width="13" height="13" viewBox="0 0 14 14" fill="none"
                className="shrink-0 text-[#0A0B0D]/40"
                aria-hidden="true"
              >
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* ── Score metric cell ───────────────────────────── */
function ScoreMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-3 py-2.5 text-center sm:px-4 sm:py-3">
      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.11em] text-[#0000FF] sm:text-[0.55rem]">
        {label}
      </p>
      <p className="mt-0.5 text-[0.95rem] font-bold leading-none tracking-tight text-[#0A0B0D] sm:text-[1.1rem]">
        {value}
      </p>
    </div>
  );
}
