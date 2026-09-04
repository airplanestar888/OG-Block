import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/public-profiles";
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
      {/* Mega-word backdrop: a static poster watermark behind the hero,
          echoing the footer's outlined type. Purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 right-0 z-0 hidden select-none font-syne text-[23.8rem] font-extrabold leading-none text-transparent md:block"
        style={{ WebkitTextStroke: "1.5px rgba(0,0,255,0.10)" }}
      >
        OG
      </div>

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

            {/* Headline — poster treatment, mirroring the footer */}
            <div className="reveal reveal-d1 flex flex-col gap-3">
              <h1
                className="font-syne leading-[0.98] text-[#0A0B0D]"
                style={{ fontSize: "clamp(1.9rem, 4vw, 3.1rem)" }}
              >
                Own status.
                <span
                  className="block text-transparent"
                  style={{ WebkitTextStroke: "1.5px rgba(10,11,13,0.9)" }}
                >
                  Prove culture.
                </span>
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
                <span className="font-orbitron whitespace-nowrap text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[#0A0B0D]/60 sm:text-[0.58rem]">
                  On Chain
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
                <span className="font-orbitron text-[0.55rem] font-semibold text-[#0A0B0D]/60 sm:text-[0.58rem]">Live</span>
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
                <span className="font-syne w-8 shrink-0 text-[0.95rem] leading-none text-baseblue sm:w-9 sm:text-[1.05rem]">
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
      <p className="font-orbitron text-[0.5rem] font-semibold uppercase tracking-[0.12em] text-[#0000FF] sm:text-[0.53rem]">
        {label}
      </p>
      <p className="font-orbitron mt-0.5 text-[0.9rem] font-bold leading-none tracking-[0.02em] text-[#0A0B0D] sm:text-[1rem]">
        {value}
      </p>
    </div>
  );
}
