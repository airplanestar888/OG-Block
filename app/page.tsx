import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PixelField } from "@/components/pixel-field";

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
                className="leading-[0.94] text-[#0A0B0D]"
                style={{
                  fontFamily:    "'Bebas Neue', sans-serif",
                  fontSize:      "clamp(3.2rem, 6.58vw, 4.89rem)",
                  letterSpacing: "0.01em",
                }}
              >
                Own status.<br />
                Prove culture.
              </h1>
              <p
                className="text-[0.9rem] leading-[1.55] text-[#0A0B0D]/50 sm:text-[0.95rem]"
                style={{ letterSpacing: "-0.01em", maxWidth: "34ch" }}
              >
                Link your X identity, Base wallet, and NFT holdings into a
                public social score on Base.
              </p>
            </div>

            {/* CTAs */}
            <div className="reveal reveal-d2 flex flex-wrap gap-2.5 sm:gap-3">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="focus-ring inline-flex h-10 items-center justify-center rounded-[12px] bg-[#0000FF] px-5 text-[0.85rem] font-semibold text-white transition duration-200 hover:bg-[#141CB5] active:opacity-80 sm:h-11 sm:text-[0.875rem]"
              >
                {session ? "Open dashboard" : "Start with X"}
              </Link>
              <Link
                href="/leaderboard"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-[12px] border border-[rgba(10,11,13,0.12)] bg-white px-5 text-[0.85rem] font-semibold text-[#0A0B0D]/65 transition duration-200 hover:border-[rgba(10,11,13,0.26)] hover:text-[#0A0B0D] sm:h-11 sm:text-[0.875rem]"
              >
                View leaderboard
              </Link>
            </div>
          </aside>

          {/* ── RIGHT — NFT image + score ── */}
          <div className="reveal reveal-d2 flex flex-col gap-2.5">

            {/* Image */}
            <div className="nft-image-wrap">
              <Image
                className="nft-img h-full w-full object-cover grayscale"
                src="/og-nft-grid.png"
                alt="OG-Block NFT collection"
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
                <span className="whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#0A0B0D]/36 sm:text-[0.6rem]">
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
                <span className="text-[0.58rem] font-semibold text-[#0A0B0D]/36 sm:text-[0.6rem]">Live</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="page-container relative pb-10 pt-2 sm:pb-14 sm:pt-4">
        <div className="reveal reveal-d3 border-t border-[rgba(10,11,13,0.08)]">
          {[
            { num: "01", title: "Membership",  copy: "NFT as identity access" },
            { num: "02", title: "Score",        copy: "Social status from your holdings" },
            { num: "03", title: "Leaderboard",  copy: "Compete publicly by rank" },
            { num: "04", title: "X Visibility", copy: "Badge where culture lives" },
            { num: "05", title: "Rewards",      copy: "Roles and allowlists for OGs" },
          ].map(({ num, title, copy }) => (
            <div
              key={title}
              className="feature-row flex items-center justify-between gap-4 py-4 sm:gap-6 sm:py-5"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="w-6 shrink-0 text-[0.65rem] font-semibold tabular-nums text-[#0A0B0D]/22 sm:w-7 sm:text-[0.68rem]">
                  {num}
                </span>
                <div>
                  <p
                    className="text-[0.88rem] font-semibold text-[#0A0B0D] sm:text-[0.9rem]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-[#0A0B0D]/44 sm:text-[0.78rem]">{copy}</p>
                </div>
              </div>
              <svg
                width="13" height="13" viewBox="0 0 14 14" fill="none"
                className="shrink-0 text-[#0A0B0D]/18"
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

      {/* ── ROADMAP ───────────────────────────────────── */}
      <section className="page-container relative pb-16 sm:pb-20">
        <div className="reveal reveal-d4 overflow-hidden rounded-[22px] border border-[rgba(10,11,13,0.08)] bg-[#F7F8FB]">
          <div className="grid gap-px bg-[rgba(10,11,13,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-white p-5 sm:p-7 lg:p-8">
              <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.18em] text-[#0000FF]/70">
                Roadmap
              </p>
              <h2
                className="mt-3 max-w-md text-[clamp(2.25rem,5vw,4.1rem)] font-semibold leading-[0.95] text-[#0A0B0D]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.01em" }}
              >
                Live score changes. Snapshots preserve status.
              </h2>
              <p className="mt-4 max-w-[36rem] text-[0.88rem] leading-6 text-[#0A0B0D]/52 sm:text-[0.95rem]">
                OG-Block will turn score history into versioned proofs. Genesis captures the earliest verified culture proof, then each season can become a mintable badge.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#0000FF]/16 bg-[#0000FF]/5 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[#0000FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0000FF]" />
                Snapshot first, mint later
              </div>
            </div>

            <div className="grid gap-px bg-[rgba(10,11,13,0.08)] sm:grid-cols-2">
              <RoadmapCard
                num="01"
                title="Genesis Snapshot"
                status="First proof"
                copy="Lock the first recorded score, rank, wallet proof, and culture state before the leaderboard evolves."
              />
              <RoadmapCard
                num="02"
                title="Versioned Receipts"
                status="v1 / Season 01"
                copy="Every major refresh can produce a named score version, so holders can compare status across seasons."
              />
              <RoadmapCard
                num="03"
                title="Mintable NFT Badges"
                status="Onchain badge"
                copy="Mint selected snapshots as NFT badges like Genesis Holder, OG Score v1, or Season Rank."
              />
              <RoadmapCard
                num="04"
                title="Agent Wallet Slots"
                status="Delegated future"
                copy="Add identity, vault, and agent wallet slots so delegated wallets can act without replacing the identity wallet."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── Score metric cell ───────────────────────────── */
function ScoreMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-center px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[0.52rem] font-semibold uppercase tracking-[0.11em] text-[#0000FF]/60 sm:text-[0.55rem]">
        {label}
      </p>
      <p className="mt-0.5 text-[0.95rem] font-bold leading-none tracking-tight text-[#0A0B0D] sm:text-[1.1rem]">
        {value}
      </p>
    </div>
  );
}

function RoadmapCard({
  num,
  title,
  status,
  copy
}: {
  num: string;
  title: string;
  status: string;
  copy: string;
}) {
  return (
    <article className="bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.62rem] font-bold tabular-nums text-[#0000FF]/62">{num}</span>
        <span className="rounded-full border border-[rgba(10,11,13,0.08)] px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[#0A0B0D]/38">
          {status}
        </span>
      </div>
      <h3 className="mt-6 text-[1rem] font-semibold tracking-[-0.02em] text-[#0A0B0D]">
        {title}
      </h3>
      <p className="mt-2 text-[0.78rem] leading-6 text-[#0A0B0D]/50">
        {copy}
      </p>
    </article>
  );
}
