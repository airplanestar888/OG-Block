import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PixelField } from "@/components/pixel-field";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <PixelField />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-12 sm:px-8 lg:pt-16">

        {/* Two-column grid: left text fixed, right image fills rest */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[380px_1fr] lg:gap-14 xl:grid-cols-[420px_1fr]">

          {/* ── LEFT PANE ── */}
          <aside className="flex flex-col gap-7">

            {/* Headline */}
            <div className="reveal reveal-d1 flex flex-col gap-3">
              <h1
                className="leading-[0.94] text-[#0A0B0D]"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "clamp(3.2rem, 6.58vw, 4.89rem)",
                  letterSpacing: "0.01em",
                }}
              >
                Own status.<br />
                Prove culture.
              </h1>
              <p
                className="text-[0.95rem] leading-[1.5] text-[#0A0B0D]/50"
                style={{ letterSpacing: "-0.01em" }}
              >
                Link your X identity, Base wallet, and NFT holdings into a
                public social score on Base.
              </p>
            </div>

            {/* CTAs */}
            <div className="reveal reveal-d2 flex flex-wrap gap-3">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-[12px] bg-[#0000FF] px-5 text-[0.875rem] font-semibold text-white transition duration-200 hover:bg-[#141CB5] active:opacity-80"
              >
                {session ? "Open dashboard" : "Start with X"}
              </Link>
              <Link
                href="/leaderboard"
                className="focus-ring inline-flex h-11 items-center justify-center rounded-[12px] border border-[rgba(10,11,13,0.12)] bg-white px-5 text-[0.875rem] font-semibold text-[#0A0B0D]/65 transition duration-200 hover:border-[rgba(10,11,13,0.26)] hover:text-[#0A0B0D]"
              >
                View leaderboard
              </Link>
            </div>
          </aside>

          {/* ── RIGHT PANE — NFT image + score below ── */}
          <div className="reveal reveal-d2 flex flex-col gap-3">

            {/* Image */}
            <div
              className="w-full overflow-hidden rounded-[18px] bg-[#f0f0f0]"
              style={{ maxHeight: "462px" }}
            >
              <Image
                className="nft-img h-full w-full object-cover grayscale"
                src="/og-nft-grid.png"
                alt="OG-Block NFT collection"
                width={1776}
                height={864}
                priority
                style={{ display: "block" }}
              />
            </div>

            {/* Score card — compact, below image */}
            <div className="flex items-stretch overflow-hidden rounded-[14px] border border-[rgba(10,11,13,0.08)] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
              {/* Label pill */}
              <div className="flex items-center gap-2 border-r border-[rgba(10,11,13,0.07)] px-4 py-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0000FF]" />
                <span className="whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#0A0B0D]/36">
                  NFT Score
                </span>
              </div>
              {/* Metrics inline */}
              <div className="flex flex-1 divide-x divide-[rgba(10,11,13,0.07)]">
                <ScoreMetric label="Score"  value="250" />
                <ScoreMetric label="Rank"   value="#12" />
                <ScoreMetric label="Status" value="OG" isLast />
              </div>
              {/* Live dot */}
              <div className="flex items-center gap-1.5 border-l border-[rgba(10,11,13,0.07)] px-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00c48c]" />
                <span className="text-[0.6rem] font-semibold text-[#0A0B0D]/36">Live</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-4 sm:px-8">
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
              className="feature-row flex items-center justify-between gap-6 py-4 sm:py-5"
            >
              <div className="flex items-center gap-5">
                <span className="w-7 shrink-0 text-[0.68rem] font-semibold tabular-nums text-[#0A0B0D]/22">
                  {num}
                </span>
                <div>
                  <p
                    className="text-[0.9rem] font-semibold text-[#0A0B0D]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {title}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-[#0A0B0D]/44">{copy}</p>
                </div>
              </div>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
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
    </main>
  );
}

/* ── Score metric cell — compact inline version ──── */
function ScoreMetric({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center px-4 py-3">
      <p className="text-[0.55rem] font-semibold uppercase tracking-[0.11em] text-[#0000FF]/60">
        {label}
      </p>
      <p className="mt-0.5 text-[1.1rem] font-bold leading-none tracking-tight text-[#0A0B0D]">
        {value}
      </p>
    </div>
  );
}
