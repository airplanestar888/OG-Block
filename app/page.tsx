import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLeaderboard } from "@/lib/public-profiles";
import { PoweredBy } from "@/components/powered-by";
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

      {/* ── SECTION 1 · HERO — the one exception: full screen so every
             element fits. All other sections match the footer height. ── */}
      <section
        className="relative flex min-h-[calc(100svh-4.25rem)] flex-col overflow-x-clip"
        style={{
          paddingTop:    "clamp(0.75rem, 2vw, 1.5rem)",
          paddingBottom: "var(--hero-pb)",
        }}
      >
        <div className="page-container flex flex-1 flex-col">
          <div className="grid w-full my-auto gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-14">
            {/* LEFT — liquid rail + statement + CTA (behind the mascot) */}
            <div className="reveal reveal-d1 flex gap-4 sm:gap-6">
              {/* Liquid rail — blue metallic flow that follows the headline height */}
              <div
                aria-hidden="true"
                className="liquid-rail w-3 shrink-0 self-stretch rounded-full sm:w-4"
              />
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">
                  Own Gang on Blockchain
                </p>
                <h1
                  className="font-syne mt-4 leading-[0.95] text-[#0A0B0D]"
                  style={{ fontSize: "clamp(2.4rem, 6vw, 5.5rem)" }}
                >
                  Own status.
                  <span
                    className="block text-transparent"
                    style={{ WebkitTextStroke: "2px rgba(10,11,13,0.9)" }}
                  >
                    Prove culture.
                  </span>
                </h1>
                <p
                  className="mt-6 text-justify text-[0.95rem] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#0A0B0D]/65 sm:text-base"
                  style={{ maxWidth: "42ch" }}
                >
                  Your NFT history becomes a score, rank, and proof of culture —
                  verified on-chain, ranked live, visible on X.
                </p>
                <div className="reveal reveal-d2 mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/try" className="btn-primary btn-grain">
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

                {/* ── Live figures — inside the hero block, under the CTA ── */}
                <div className="reveal reveal-d3 mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-[rgba(10,11,13,0.1)] pt-5">
                  <HeroFigure label="Gangs" value={profiles.toLocaleString()} />
                  <HeroFigure label="Total score" value={formatCompactNumber(totalScore)} />
                  <HeroFigure label="NFTs" value={formatCompactNumber(totalNfts)} />
                  <span className="inline-flex items-center gap-1.5 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-emerald-600">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT — mascot hugging the right edge, in front, locked to its
                natural 451:655 ratio (never upscaled past the source). */}
            <div className="mascot-stage relative hidden lg:block">
              <img
                src="/mascot.png"
                alt="OG BLOCK mascot"
                className="mascot-img absolute bottom-0 right-[-5px] z-10 h-[min(88svh,582px)] w-auto max-w-none [aspect-ratio:451/655] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2 · POWERED BY ───────────────────── */}
      <PoweredBy />

      {/* ── SECTION 3 · FEATURES — title left, numbered grid right ── */}
      <section className="page-container relative flex min-h-[81svh] items-center py-20 sm:py-24">
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
                    className="mt-0.5 shrink-0 text-[#0A0B0D]/60"
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

/* ── Hero figure — hairline-row number, no box ──────────────────── */
function HeroFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#0A0B0D]/45">{label}</p>
      <p className="font-orbitron mt-1 text-2xl font-bold leading-none tracking-tight text-[#0A0B0D] sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
