"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { XAvatar } from "@/components/x-avatar";
import type { PublicLeaderboardProfile } from "@/lib/types";

type LeaderboardViewProps = {
  leaderboard: PublicLeaderboardProfile[];
};

type PodiumPlace = 1 | 2 | 3;

const PLACE_STYLES: Record<
  PodiumPlace,
  {
    chip: string;
    chipRing: string;
    pedestal: string;
    panelGlow: string;
    avatarSize: number;
    nameSize: string;
  }
> = {
  1: {
    chip: "bg-gradient-to-b from-[#F7D77A] to-[#E5B54A] text-white",
    chipRing: "ring-[#D9A93F]/40",
    pedestal: "from-[#fdfdfb] to-[#f4ecda]",
    panelGlow: "shadow-[0_18px_44px_rgba(217,169,63,0.16)]",
    avatarSize: 88,
    nameSize: "text-xl",
  },
  2: {
    chip: "bg-gradient-to-b from-[#EAEEF3] to-[#C9D1DB] text-white",
    chipRing: "ring-[#B7BFCB]/50",
    pedestal: "from-[#fcfdfe] to-[#eceff4]",
    panelGlow: "shadow-[0_14px_36px_rgba(10,11,13,0.08)]",
    avatarSize: 68,
    nameSize: "text-lg",
  },
  3: {
    chip: "bg-gradient-to-b from-[#F0D2B2] to-[#D8A26A] text-white",
    chipRing: "ring-[#C08A55]/40",
    pedestal: "from-[#fdfcfa] to-[#f3e7d8]",
    panelGlow: "shadow-[0_14px_36px_rgba(192,138,85,0.14)]",
    avatarSize: 68,
    nameSize: "text-lg",
  }
};

const PEDESTAL_HEIGHT: Record<PodiumPlace, string> = {
  1: "min-h-[212px]",
  2: "min-h-[132px]",
  3: "min-h-[112px]"
};

function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString();
}

function formatUtcDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 21h8M12 17.5V21M7 4h10v5a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 6H4.2a2.8 2.8 0 0 0 3.1 3.6M17 6h2.8a2.8 2.8 0 0 1-3.1 3.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LeaderboardView({ leaderboard }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { data: session } = useSession();

  const filteredProfiles = useMemo(() => {
    return leaderboard.filter((profile) => {
      if (!searchQuery) return true;
      return (
        profile.xHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (profile.xName && profile.xName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [leaderboard, searchQuery]);

  const featuredProfiles = leaderboard.slice(0, 3);
  const podium = [featuredProfiles[1], featuredProfiles[0], featuredProfiles[2]];
  const podiumVisible = featuredProfiles.length > 0 && !searchQuery;
  // The top 3 live in the podium; the table covers everyone else — until a
  // search is active, then matches (including the top 3) all show here.
  const tableRows = searchQuery ? filteredProfiles : filteredProfiles.slice(3);

  const totalNfts = leaderboard.reduce((total, profile) => total + profile.nftCount, 0);
  const totalScore = leaderboard.reduce((total, profile) => total + profile.score, 0);
  const latestGeneratedAt = useMemo(() => {
    let latest: string | null = null;
    for (const profile of leaderboard) {
      const ts = profile.lastCalculatedAt;
      if (ts && (!latest || new Date(ts).getTime() > new Date(latest).getTime())) {
        latest = ts;
      }
    }
    return latest;
  }, [leaderboard]);

  const myHandle = session?.user?.xHandle;
  const myProfile = myHandle
    ? leaderboard.find((profile) => profile.xHandle === myHandle)
    : undefined;

  const openProfile = (handle: string) => handle && router.push(`/u/${handle}`);

  return (
    <div className="space-y-8">
      {/* Top Header & Stats */}
      <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Leaderboard</p>
          <h1
            className="font-bebas mt-2 max-w-2xl text-[clamp(2.2rem,4.5vw,3.4rem)] font-normal leading-[0.98] text-[#0A0B0D]"
            style={{
              letterSpacing: "0.02em",
            }}
          >
            Who holds the most.
            <br className="hidden lg:inline" />
            Who ranks the highest.
          </h1>
        </div>

        <div className="rounded-[1.75rem] border border-black/10 bg-white/85 shadow-[0_1px_2px_rgba(10,11,13,0.04),0_16px_40px_rgba(0,0,255,0.06)] backdrop-blur">
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-black/40">Live standings</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-3 text-base font-semibold leading-snug text-ink">
              OG status is earned, not claimed.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-black/55">
              Every verified profile, ranked live from on-chain Base holdings.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <HeroStat label="Profiles" value={leaderboard.length} />
              <HeroStat label="Total score" value={formatCompactNumber(totalScore)} />
              <HeroStat label="NFTs" value={formatCompactNumber(totalNfts)} />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Top 3 Podium */}
      {podiumVisible ? (
        <>
          <section className="grid items-end gap-5 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            {podium.map((profile, position) => {
              if (!profile) return null;
              const place = ((position === 1 ? 1 : position === 0 ? 2 : 3) as PodiumPlace);
              const styles = PLACE_STYLES[place];
              const orderClass =
                place === 1 ? "order-1 sm:order-2" : place === 2 ? "order-2 sm:order-1" : "order-3";

              return (
                <article
                  key={`podium-${profile.xHandle || place}`}
                  onClick={() => openProfile(profile.xHandle)}
                  className={`group flex flex-col items-center text-center ${orderClass} ${
                    profile.xHandle ? "cursor-pointer" : ""
                  }`}
                >
                  <span className="rounded-full bg-white p-0.5 shadow-[0_10px_24px_rgba(10,11,13,0.14)] ring-2 ring-white">
                    <XAvatar
                      src={profile.xAvatar}
                      handle={profile.xHandle}
                      size={styles.avatarSize}
                    />
                  </span>
                  <div className="mt-3 flex items-center gap-1.5">
                    <h2 className={`font-semibold tracking-tight text-black/90 ${styles.nameSize}`}>
                      {profile.xHandle ? (
                        <Link
                          href={`/u/${profile.xHandle}`}
                          onClick={(e) => e.stopPropagation()}
                          className="transition hover:text-baseblue hover:underline"
                        >
                          {profile.xName || `@${profile.xHandle}`}
                        </Link>
                      ) : (
                        `@${profile.xHandle}`
                      )}
                    </h2>
                    {profile.profileRole === "agent" ? (
                      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-black/55">
                        Agent
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-black/45">
                    {profile.xName ? `@${profile.xHandle}` : "Wallet verified"}
                  </p>

                  {/* Pedestal */}
                  <div
                    className={`relative mt-9 flex w-full flex-col items-center rounded-t-[1.4rem] border border-b-0 border-black/[0.07] bg-gradient-to-b px-5 pt-9 pb-6 ${PEDESTAL_HEIGHT[place]} ${styles.pedestal} ${styles.panelGlow} transition-all duration-200 group-hover:-translate-y-0.5`}
                  >
                    <span
                      className={`absolute -top-5 grid size-10 place-items-center rounded-xl ring-4 ring-white ${styles.chip} ${styles.chipRing}`}
                    >
                      <TrophyIcon />
                    </span>
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-black/40">
                      Culture score
                    </p>
                    <p className="mt-1 text-3xl font-bold leading-none tracking-tight text-ink">
                      {formatCompactNumber(profile.score)}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-black/55">
                      <span>{profile.nftCount.toLocaleString()} NFT</span>
                      <span className="h-3 w-px bg-black/10" aria-hidden="true" />
                      <span>{profile.badgeCount.toLocaleString()} badge</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Personal standing pill — extra breathing room above the board panel */}
          <div className="flex justify-center pb-5 pt-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-sm text-black/60 shadow-[0_1px_2px_rgba(10,11,13,0.04),0_8px_24px_rgba(0,0,255,0.05)]">
              <span className="inline-block size-2 rounded-full bg-baseblue" aria-hidden="true" />
              {myProfile?.rank ? (
                <span>
                  You&apos;re ranked <span className="font-bold text-ink">#{myProfile.rank}</span> of{" "}
                  <span className="font-bold text-ink">{leaderboard.length}</span> verified profiles
                </span>
              ) : (
                <span>
                  <span className="font-bold text-ink">{leaderboard.length}</span> verified profiles,
                  ranked live from Base
                </span>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Main Culture Board */}
      <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <h2 className="font-semibold text-black/88">Culture board</h2>
            <p className="mt-1 text-sm text-black/65">
              {podiumVisible
                ? "Full rankings across all verified OG BLOCK profiles — top 3 featured above."
                : "Live rankings across all verified OG BLOCK profiles."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative min-w-44">
              <input
                type="text"
                placeholder="Search @handle..."
                aria-label="Search profiles by X handle or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[#fbfcff] px-3.5 py-1.5 text-xs text-ink placeholder:text-black/50 focus:border-baseblue focus:outline-none focus:ring-1 focus:ring-baseblue"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-black/40 hover:text-black"
                  type="button"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Mobile Swipe Notice */}
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:hidden">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Swipe table</span>
          <span className="text-sm text-baseblue" aria-hidden="true">-&gt;</span>
        </div>

        {/* Rankings Table with balanced column widths & alignment */}
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <thead className="bg-black/[0.03] text-black/55">
              <tr>
                <th className="w-[10%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">Rank</th>
                <th className="w-[38%] px-6 py-4 pl-10 text-left text-xs font-bold uppercase tracking-[0.12em]">X</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">NFT</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">Badge</th>
                <th className="w-[22%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {tableRows.map((profile, index) => {
                // A zero score with a negative delta reads oddly ("why minus
                // at 0?") — only show movement for profiles that still hold
                // points.
                const hasGain = (profile.recentPointsDelta ?? 0) > 0 && profile.score > 0;
                const hasDrop = (profile.recentPointsDelta ?? 0) < 0 && profile.score > 0;

                return (
                  <tr
                    key={profile.xHandle || index}
                    onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
                    className={`transition hover:bg-baseblue/[0.05] ${profile.xHandle ? "cursor-pointer" : ""}`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-black/[0.04] px-3 py-1 text-xs font-bold text-black/70">
                        {profile.rank ? `#${profile.rank}` : "-"}
                      </span>
                    </td>

                    {/* X / Profile */}
                    <td className="px-6 py-4 pl-10 text-left">
                      <div className="flex items-center gap-3 text-left">
                        <XAvatar src={profile.xAvatar} handle={profile.xHandle} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-semibold text-black/85">
                              {profile.xHandle ? (
                                <Link
                                  href={`/u/${profile.xHandle}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="transition hover:text-baseblue hover:underline"
                                >
                                  @{profile.xHandle}
                                </Link>
                              ) : (
                                `@${profile.xHandle}`
                              )}
                            </p>
                            {profile.profileRole === "agent" ? (
                              <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-black/60">
                                Agent
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-black/40">
                            {profile.xName || "Wallet verified"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* NFT */}
                    <td className="px-6 py-4 text-center font-semibold text-black/76">
                      {profile.nftCount.toLocaleString()}
                    </td>

                    {/* Badge */}
                    <td className="px-6 py-4 text-center font-semibold text-black/76">
                      {profile.badgeCount.toLocaleString()}
                    </td>

                    {/* Score & ▲ +X pts placed right beside the Score */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2.5">
                        <span className="rounded-full bg-baseblue px-3 py-1 text-xs font-bold text-white shadow-sm">
                          {formatCompactNumber(profile.score)}
                        </span>

                        {/* ▲ +X pts directly beside the score */}
                        {hasGain && profile.recentPointsDelta ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                            title={`Score increased by +${profile.recentPointsDelta.toLocaleString()} points`}
                          >
                            <span className="text-[0.68rem]">▲</span>
                            <span>+{formatCompactNumber(profile.recentPointsDelta)} pts</span>
                          </span>
                        ) : null}

                        {hasDrop && profile.recentPointsDelta ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700"
                            title={`Score decreased by ${profile.recentPointsDelta.toLocaleString()} points`}
                          >
                            <span className="text-[0.68rem]">▼</span>
                            <span>{formatCompactNumber(profile.recentPointsDelta)} pts</span>
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tableRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-black/55" colSpan={5}>
                    {searchQuery
                      ? `No profiles matching "${searchQuery}"`
                      : leaderboard.length > 0
                        ? "The top 3 are featured above."
                        : "No scored profiles yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {latestGeneratedAt ? (
        <p className="-mt-2.5 text-left text-xs italic text-black/40">
          Latest generated global score:{" "}
          <time dateTime={latestGeneratedAt}>
            {formatUtcDate(latestGeneratedAt)} UTC
          </time>
        </p>
      ) : null}

    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-gradient-to-b from-[#f7f8fb] to-white px-2 py-3.5 text-center shadow-sm">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-black/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
