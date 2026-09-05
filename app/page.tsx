import Image from "next/image";
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
        className="hero-compact relative flex min-h-[calc(100svh-4.25rem)] flex-col overflow-x-clip"
        style={{
          paddingTop:    "clamp(0.75rem, 2vw, 1.5rem)",
          paddingBottom: "var(--hero-pb)",
        }}
      >
        <div className="page-container flex flex-1 flex-col">
          <div className="grid min-w-0 w-full my-auto gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-14">
            {/* LEFT — liquid rail + statement + CTA (behind the mascot) */}
            <div className="reveal reveal-d1 flex min-w-0 gap-4 sm:gap-6">
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
                  style={{ fontSize: "clamp(2.4rem, min(6vw, 11svh), 5.5rem)" }}
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
                  className="hero-copy mt-6 text-justify text-[0.95rem] font-semibold uppercase leading-[1.7] tracking-[0.04em] text-[#0A0B0D]/65 sm:text-base"
                  style={{ maxWidth: "42ch" }}
                >
                  Your NFT history becomes a score, rank, and proof of culture —
                  verified on-chain, ranked live, visible on X.
                </p>
                {/* Mascot on mobile — between the copy and the CTA */}
                <div className="mt-6 flex justify-center lg:hidden">
                  <Image
                    src="/mascot.png"
                    alt="OG BLOCK mascot"
                    width={1005}
                    height={1368}
                    sizes="(max-width: 1023px) 70vw, 1005px"
                    className="mascot-img h-[min(36svh,240px)] w-auto max-w-[70vw]"
                  />
                </div>

                <div className="hero-cta reveal reveal-d2 mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
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
                <div className="hero-figures reveal reveal-d3 mt-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-[rgba(10,11,13,0.1)] pt-5">
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
                natural 1005:1368 ratio (never upscaled past the source). */}
            <div className="mascot-stage relative hidden lg:block">
              <Image
                src="/mascot.png"
                alt="OG BLOCK mascot"
                width={1005}
                height={1368}
                sizes="(min-width: 1024px) 40vw, 1005px"
                className="mascot-img absolute bottom-0 right-[-5px] z-10 h-[min(80svh,582px)] w-auto max-w-none [aspect-ratio:1005/1368] object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2 · POWERED BY ───────────────────── */}
      <PoweredBy />

      {/* ── SECTION 3 · FEATURES — title left, numbered grid right ── */}
      <section className="page-container relative flex min-h-[81svh] items-center overflow-x-clip py-20 sm:py-24">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* Title block — slides in from the left on scroll */}
          <SlideIn direction="left" className="h-full">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">
              What you get
            </p>
            <h2 className="font-syne mt-3 leading-[0.98] text-[#0A0B0D]" style={{ fontSize: "clamp(2.3rem, 4.6vw, 3.6rem)" }}>
              <span className="block text-[#0A0B0D]/60">Built for</span>
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
                    <path d="M6 3h12l4 6-10 13L2 9Z" />
                    <path d="M11 3 8 9l4 13 4-13-3-6" />
                    <path d="M2 9h20" />
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
                    <path d="M3 17.5 9.3 11.2l3.3 3.3L20 6" />
                    <path d="M14.8 6H20v5.2" />
                    <circle cx="3" cy="17.5" r="1" />
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
                    <path d="M8 20.5h8" />
                    <path d="M12 16.5v4" />
                    <path d="M7.2 4h9.6v4.8a4.8 4.8 0 0 1-9.6 0V4Z" />
                    <path d="M7.2 5.8H4.6a.9.9 0 0 0-.9 1.1c.3 1.5 1.5 2.6 3.5 2.6" />
                    <path d="M16.8 5.8h2.6a.9.9 0 0 1 .9 1.1c-.3 1.5-1.5 2.6-3.5 2.6" />
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
                    <path d="M2.8 12S6.2 6.1 12 6.1 21.2 12 21.2 12 17.8 17.9 12 17.9 2.8 12 2.8 12Z" />
                    <circle cx="12" cy="12" r="2.4" />
                    <path d="M18.6 3.2l.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55Z" />
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
                    <rect x="3" y="7.5" width="18" height="12" rx="1.6" />
                    <path d="M3 10.5h18" />
                    <path d="M16.5 13.4l1.2 1.3-1.2 1.3-1.2-1.3Z" />
                    <path d="M18.8 2.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z" />
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
                    width="44" height="44" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.1"
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
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#0A0B0D]/65">{label}</p>
      <p className="font-orbitron mt-1 text-2xl font-bold leading-none tracking-tight text-[#0A0B0D] sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
