"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { XAvatar } from "@/components/x-avatar";
import { PageHeading } from "@/components/page-heading";
import { SlideIn } from "@/components/reveal-in-view";
import type { PublicLeaderboardProfile } from "@/lib/types";

type LeaderboardViewProps = {
  leaderboard: PublicLeaderboardProfile[];
};

type PodiumPlace = 1 | 2 | 3;

const PLACE_STYLES: Record<
  PodiumPlace,
  {
    chip: string;
    glow: string;
    avatarRing: string;
    avatarSize: number;
    nameSize: string;
  }
> = {
  1: {
    chip: "bg-gradient-to-b from-[#F7D77A] to-[#E5B54A] text-[#0A0B0D]",
    glow: "shadow-[0_24px_60px_rgba(217,169,63,0.22)]",
    avatarRing: "ring-[#E5B54A]/60",
    avatarSize: 88,
    nameSize: "text-xl",
  },
  2: {
    chip: "bg-gradient-to-b from-[#EAEEF3] to-[#C9D1DB] text-[#0A0B0D]",
    glow: "shadow-[0_18px_44px_rgba(0,0,255,0.18)]",
    avatarRing: "ring-white/30",
    avatarSize: 68,
    nameSize: "text-lg",
  },
  3: {
    chip: "bg-gradient-to-b from-[#F0D2B2] to-[#D8A26A] text-[#0A0B0D]",
    glow: "shadow-[0_18px_44px_rgba(192,138,85,0.20)]",
    avatarRing: "ring-[#D8A26A]/60",
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
      <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#FF8AC2]">Own Gang · Leaderboard</p>
          <PageHeading className="mt-2 max-w-2xl text-white [&>span]:!text-transparent" outline="Who ranks the highest.">
            Who holds the most.
          </PageHeading>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
            Every verified gang profile, ranked live from on-chain NFT holdings across chains.
          </p>
        </div>

        <div className="glass relative overflow-hidden rounded-[1.5rem] text-white">
          <div className="relative p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/50">Live standings</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-emerald-200">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-3 text-base font-semibold leading-snug">
              Gang status is earned, not claimed.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <HeroStat label="Profiles" value={leaderboard.length} />
              <HeroStat label="Total score" value={formatCompactNumber(totalScore)} />
              <HeroStat label="NFTs" value={formatCompactNumber(totalNfts)} />
            </div>
          </div>
          <div className="relative flex items-center justify-between border-t border-white/10 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-block size-3.5 rounded-[5px] bg-gradient-to-br from-[#FF2E9A] to-[#7B2FF7]" />
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em]">OG BLOCK</p>
            </div>
            <p className="text-[0.65rem] text-white/45">Own Gang on Blockchain</p>
          </div>
        </div>
      </div>

      {/* Featured Top 3 Podium */}
      {podiumVisible ? (
        <>
          <section className="grid items-end gap-5 pt-6 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            {podium.map((profile, position) => {
              if (!profile) return null;
              const place = ((position === 1 ? 1 : position === 0 ? 2 : 3) as PodiumPlace);
              const styles = PLACE_STYLES[place];
              const orderClass =
                place === 1 ? "order-1 sm:order-2" : place === 2 ? "order-2 sm:order-1" : "order-3";

              return (
                <SlideIn
                  key={`podium-${profile.xHandle || place}`}
                  direction={position % 2 === 0 ? "left" : "right"}
                  delay={0.1 + position * 0.09}
                  className={orderClass}
                >
                <article
                  onClick={() => openProfile(profile.xHandle)}
                  className={`glass group relative flex flex-col items-center overflow-hidden rounded-[1.4rem] px-5 pb-6 pt-9 text-center text-white ${PEDESTAL_HEIGHT[place]} ${
                    profile.xHandle ? "cursor-pointer" : ""
                  }`}
                >
                  <span
                    className={`absolute left-1/2 top-3 grid size-10 -translate-x-1/2 place-items-center rounded-xl ${styles.chip}`}
                  >
                    <TrophyIcon />
                  </span>
                  <span className={`relative rounded-full bg-white p-0.5 ring-2 ${styles.avatarRing}`}>
                    <XAvatar
                      src={profile.xAvatar}
                      handle={profile.xHandle}
                      size={styles.avatarSize}
                    />
                  </span>
                  <div className="relative mt-3 flex items-center gap-1.5">
                    <h2 className={`font-semibold tracking-tight ${styles.nameSize}`}>
                      {profile.xHandle ? (
                        <Link
                          href={`/u/${profile.xHandle}`}
                          onClick={(e) => e.stopPropagation()}
                          className="transition hover:text-[#8FA2FF] hover:underline"
                        >
                          {profile.xName || `@${profile.xHandle}`}
                        </Link>
                      ) : (
                        `@${profile.xHandle}`
                      )}
                    </h2>
                    {profile.profileRole === "agent" ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-white/60">
                        Agent
                      </span>
                    ) : null}
                  </div>
                  <p className="relative text-xs text-white/45">
                    {profile.xName ? `@${profile.xHandle}` : "Wallet verified"}
                  </p>

                  <p className="font-orbitron relative mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Culture score
                  </p>
                  <p className="font-orbitron relative mt-1 text-3xl font-bold leading-none tracking-tight">
                    {formatCompactNumber(profile.score)}
                  </p>
                  <div className="relative mt-3 flex items-center gap-4 text-xs font-semibold text-white/55">
                    <span>{profile.nftCount.toLocaleString()} NFT</span>
                    <span className="h-3 w-px bg-white/15" aria-hidden="true" />
                    <span>{profile.badgeCount.toLocaleString()} badge</span>
                  </div>
                </article>
                </SlideIn>
              );
            })}
          </section>

          {/* Personal standing pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF2E9A] to-[#7B2FF7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(255,46,154,0.35)]">
              <span className="inline-block size-2 rounded-full bg-white" aria-hidden="true" />
              {myProfile?.rank ? (
                <span>
                  You&apos;re ranked <span className="font-bold">#{myProfile.rank}</span> of{" "}
                  <span className="font-bold">{leaderboard.length}</span> verified gangs
                </span>
              ) : (
                <span>
                  <span className="font-bold">{leaderboard.length}</span> verified gangs,
                  ranked live across chains
                </span>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Main Culture Board */}
      <section className="glass-strong overflow-hidden rounded-[1.5rem]">
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white">
          <div>
            <h2 className="font-semibold">Culture board</h2>
            <p className="mt-1 text-sm text-white/55">
              {podiumVisible
                ? "Full gang rankings — top 3 featured above."
                : "Live rankings across all verified OG BLOCK gangs."}
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
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-[#2E4BFF] focus:outline-none focus:ring-1 focus:ring-[#2E4BFF]"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                  type="button"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Mobile Swipe Notice */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:hidden">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Swipe table</span>
          <span className="text-sm text-[#FF8AC2]" aria-hidden="true">-&gt;</span>
        </div>

        {/* Mobile ranking cards — compact rows instead of a swipe table */}
        <ol className="divide-y divide-white/[0.07] sm:hidden">
          {tableRows.map((profile, index) => {
            const hasGain = (profile.recentPointsDelta ?? 0) > 0 && profile.score > 0;
            const hasDrop = (profile.recentPointsDelta ?? 0) < 0 && profile.score > 0;
            const isMe = !!(myHandle && profile.xHandle && profile.xHandle.toLowerCase() === myHandle.toLowerCase());

            return (
              <li
                key={`m-${profile.xHandle || index}`}
                onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
                className={`flex items-center gap-3 px-4 py-3.5 transition ${
                  isMe
                    ? "bg-[#FF2E9A]/[0.12] ring-1 ring-inset ring-[#FF2E9A]/40"
                    : "hover:bg-white/[0.05]"
                } ${profile.xHandle ? "cursor-pointer" : ""}`}
              >
                <span className={`inline-flex min-w-11 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                  isMe ? "bg-gradient-to-r from-[#FF2E9A] to-[#7B2FF7] text-white shadow-sm" : "bg-white/10 text-white/70"
                }`}>
                  {profile.rank ? `#${profile.rank}` : "-"}
                </span>
                <XAvatar src={profile.xAvatar} handle={profile.xHandle} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-white">@{profile.xHandle}</p>
                    {isMe ? (
                      <span className="rounded-full bg-gradient-to-r from-[#FF2E9A] to-[#7B2FF7] px-1.5 py-0.2 text-[0.6rem] font-black uppercase tracking-wider text-white">
                        YOU
                      </span>
                    ) : null}
                    {profile.profileRole === "agent" ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-white/60">
                        Agent
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/45">
                    <span>{profile.nftCount.toLocaleString()} NFTs</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5" title="Indexed on Base, ETH, Robinhood & Solana">
                      <span className="size-1.5 rounded-full bg-[#0000FF]" />
                      <span className="size-1.5 rounded-full bg-[#627EEA]" />
                      <span className="size-1.5 rounded-full bg-[#00C805]" />
                      <span className="size-1.5 rounded-full bg-[#9945FF]" />
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="rounded-full bg-gradient-to-r from-[#2E5BFF] to-[#7B2FF7] px-2.5 py-0.5 text-xs font-bold text-white">
                    {formatCompactNumber(profile.score)}
                  </span>
                  {hasGain && profile.recentPointsDelta ? (
                    <span className="text-[0.65rem] font-bold text-emerald-300">
                      ▲ {formatCompactNumber(profile.recentPointsDelta)}
                    </span>
                  ) : null}
                  {hasDrop && profile.recentPointsDelta ? (
                    <span className="text-[0.65rem] font-bold text-rose-300">
                      ▼ {formatCompactNumber(profile.recentPointsDelta)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
          {tableRows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-white/55">
              {searchQuery
                ? `No profiles matching "${searchQuery}"`
                : leaderboard.length > 0
                  ? "The top 3 are featured above."
                  : "No scored profiles yet."}
            </li>
          ) : null}
        </ol>

        {/* Rankings Table with balanced column widths & alignment (desktop) */}
        <div className="hidden overflow-x-auto overscroll-x-contain sm:block">
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <thead className="text-white/50">
              <tr className="border-b border-white/10">
                <th className="font-orbitron w-[10%] px-6 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em]">Rank</th>
                <th className="font-orbitron w-[38%] px-6 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em]">X</th>
                <th className="font-orbitron w-[15%] px-6 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em]">NFT</th>
                <th className="font-orbitron w-[15%] px-6 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em]">Badge</th>
                <th className="font-orbitron w-[22%] px-6 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.14em]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {tableRows.map((profile, index) => {
                const hasGain = (profile.recentPointsDelta ?? 0) > 0 && profile.score > 0;
                const hasDrop = (profile.recentPointsDelta ?? 0) < 0 && profile.score > 0;
                const isMe = !!(myHandle && profile.xHandle && profile.xHandle.toLowerCase() === myHandle.toLowerCase());

                return (
                  <tr
                    key={profile.xHandle || index}
                    onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
                    className={`transition ${
                      isMe
                        ? "bg-[#FF2E9A]/[0.10] hover:bg-[#FF2E9A]/[0.16]"
                        : "hover:bg-white/[0.05]"
                    } ${profile.xHandle ? "cursor-pointer" : ""}`}
                  >
                    {/* Rank */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex min-w-12 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                        isMe ? "bg-gradient-to-r from-[#FF2E9A] to-[#7B2FF7] text-white shadow-sm" : "bg-white/10 text-white/70"
                      }`}>
                        {profile.rank ? `#${profile.rank}` : "-"}
                      </span>
                    </td>

                    {/* X / Profile */}
                    <td className="px-6 py-4 pl-[70px] text-left">
                      <div className="flex items-center gap-3 text-left">
                        <XAvatar src={profile.xAvatar} handle={profile.xHandle} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-semibold text-white">
                              {profile.xHandle ? (
                                <Link
                                  href={`/u/${profile.xHandle}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="transition hover:text-[#FF8AC2] hover:underline"
                                >
                                  @{profile.xHandle}
                                </Link>
                              ) : (
                                `@${profile.xHandle}`
                              )}
                            </p>
                            {isMe ? (
                              <span className="rounded-full bg-gradient-to-r from-[#FF2E9A] to-[#7B2FF7] px-1.5 py-0.2 text-[0.6rem] font-black uppercase tracking-wider text-white">
                                YOU
                              </span>
                            ) : null}
                            {profile.profileRole === "agent" ? (
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-white/60">
                                Agent
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white/45">
                            <span>{profile.nftCount.toLocaleString()} NFTs</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1" title="Indexed across chains">
                              <span className="size-1.5 rounded-full bg-[#38E1FF]" />
                              <span className="size-1.5 rounded-full bg-[#7B2FF7]" />
                              <span className="size-1.5 rounded-full bg-[#00C805]" />
                              <span className="size-1.5 rounded-full bg-[#FF2E9A]" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* NFT */}
                    <td className="px-6 py-4 text-center font-semibold text-white/80">
                      {profile.nftCount.toLocaleString()}
                    </td>

                    {/* Badge */}
                    <td className="px-6 py-4 text-center font-semibold text-white/80">
                      {profile.badgeCount.toLocaleString()}
                    </td>

                    {/* Score & ▲ +X pts placed right beside the Score */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2.5">
                        <span className="rounded-full bg-gradient-to-r from-[#2E5BFF] to-[#7B2FF7] px-3 py-1 text-xs font-bold text-white shadow-sm">
                          {formatCompactNumber(profile.score)}
                        </span>

                        {/* ▲ +X pts directly beside the score */}
                        {hasGain && profile.recentPointsDelta ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-0.5 text-xs font-bold text-emerald-200"
                            title={`Score increased by +${profile.recentPointsDelta.toLocaleString()} points`}
                          >
                            <span className="text-[0.68rem]">▲</span>
                            <span>+{formatCompactNumber(profile.recentPointsDelta)}</span>
                          </span>
                        ) : null}

                        {hasDrop && profile.recentPointsDelta ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-300/10 px-2.5 py-0.5 text-xs font-bold text-rose-200"
                            title={`Score decreased by ${profile.recentPointsDelta.toLocaleString()} points`}
                          >
                            <span className="text-[0.68rem]">▼</span>
                            <span>{formatCompactNumber(profile.recentPointsDelta)}</span>
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tableRows.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-white/55" colSpan={5}>
                    {searchQuery
                      ? `No gangs matching "${searchQuery}"`
                      : leaderboard.length > 0
                        ? "The top 3 are featured above."
                        : "No scored gangs yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {latestGeneratedAt ? (
        <p className="-mt-2.5 text-left text-xs italic text-white/40">
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-3.5 text-center">
      <p className="font-orbitron text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="font-orbitron mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
