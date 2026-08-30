import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PixelField } from "@/components/pixel-field";
import { PoweredBy } from "@/components/powered-by";


export default async function HomePage() {
  const session = await auth();

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
              <Link href={session ? "/og-card" : "/login"} className="btn-primary">
                {session ? "Get your badge" : "Sign in"}
              </Link>
              <Link href="/try" className="btn-secondary">
                Try yours
              </Link>
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
                  NFT Score
                </span>
              </div>

              {/* Metrics */}
              <div className="flex flex-1 divide-x divide-[rgba(10,11,13,0.07)]">
                <ScoreMetric label="Score"  value="250" />
                <ScoreMetric label="Rank"   value="#12" />
                <ScoreMetric label="Status" value="OG"  />
              </div>

              {/* Live — hidden xs */}
              <div className="score-live-col flex items-center gap-1.5 border-l border-[rgba(10,11,13,0.07)] px-3 sm:px-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00c48c]" />
                <span className="text-[0.58rem] font-semibold text-[#0A0B0D]/60 sm:text-[0.6rem]">Live</span>
              </div>
            </div>

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
