import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/public-profiles";
import { PoweredBy } from "@/components/powered-by";
import { HoloImage } from "@/components/holo-image";
import { SlideIn } from "@/components/reveal-in-view";

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

            {/* Image — hologram treatment */}
            <HoloImage>
              <Image
                className="nft-img h-full w-full object-cover"
                src="/og-nft-grid.png"
                alt="OG BLOCK NFT collection"
                width={1776}
                height={864}
                priority
              />
            </HoloImage>

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
        <div className="reveal reveal-d3 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-transparent bg-white/70 p-3.5 backdrop-blur-sm sm:px-5 sm:py-3">
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

      {/* ── FEATURES — standalone screen: title left, 2x2 icon grid right ── */}
      <section className="page-container relative flex min-h-[88vh] flex-col justify-center py-20 sm:py-24">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* Title block — slides in from the left on scroll */}
          <SlideIn direction="left" className="h-full">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">
              What you get
            </p>
            <h2 className="font-syne mt-3 leading-[0.98] text-[#0A0B0D]" style={{ fontSize: "clamp(2.3rem, 4.6vw, 3.6rem)" }}>
              <span className="block text-[#0A0B0D]/35">Built for</span>
              culture.
            </h2>
            <div className="mt-6 h-[3px] w-20 bg-[#0A0B0D]" />
            <p className="mt-6 max-w-sm text-[0.9rem] leading-[1.6] text-[#0A0B0D]/65">
              One profile turns everything you hold into status you can prove —
              scored, ranked, and visible everywhere that matters.
            </p>
          </SlideIn>

          {/* Feature grid — items converge from alternating sides */}
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {[
              {
                num: "01",
                title: "Membership",
                copy: "Your NFTs become your identity",
                wide: false,
                icon: (
                  <g>
                    <path d="M16 10h2" />
                    <path d="M16 14h2" />
                    <path d="M6.17 15a3 3 0 0 1 5.66 0" />
                    <circle cx="9" cy="11" r="2" />
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                  </g>
                )
              },
              {
                num: "02",
                title: "Culture Score",
                copy: "Rank built from what you actually hold",
                wide: false,
                icon: (
                  <g>
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </g>
                )
              },
              {
                num: "03",
                title: "Leaderboard",
                copy: "Public proof of where you stand",
                wide: false,
                icon: (
                  <g>
                    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                    <rect x="15" y="5" width="4" height="12" rx="1" />
                    <rect x="7" y="8" width="4" height="9" rx="1" />
                  </g>
                )
              },
              {
                num: "04",
                title: "X Visibility",
                copy: "Your rank, live on every X profile",
                wide: false,
                icon: (
                  <g>
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                    <circle cx="12" cy="12" r="3" />
                  </g>
                )
              },
              {
                num: "05",
                title: "Agent Wallet Ready",
                copy: "Let your agent hold, score, and mint — its own verified wallet on the profile.",
                wide: true,
                icon: (
                  <g>
                    <path d="M12 8V4H8" />
                    <rect x="4" y="8" width="16" height="12" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </g>
                )
              }
            ].map(({ num, title, copy, wide, icon }, i) => (
              <SlideIn
                key={title}
                direction={i % 2 === 0 ? "left" : "right"}
                delay={0.1 + i * 0.09}
                className={wide ? "sm:col-span-2" : ""}
              >
                <div className="flex items-start gap-5">
                  <svg
                    width="46" height="46" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-[#0A0B0D]/35"
                    aria-hidden="true"
                  >
                    {icon}
                  </svg>
                  <div>
                    <p className="font-syne text-[0.72rem] leading-none text-baseblue">{num}</p>
                    <p className="mt-1.5 text-[0.85rem] font-extrabold uppercase tracking-[0.08em] text-[#0A0B0D]">
                      {title}
                    </p>
                    <p className="mt-1.5 max-w-md text-[0.78rem] leading-[1.55] text-[#0A0B0D]/60">{copy}</p>
                  </div>
                </div>
              </SlideIn>
            ))}
          </div>
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
