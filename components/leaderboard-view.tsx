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
    avatarRing: string;
    avatarSize: number;
    nameSize: string;
  }
> = {
  1: {
    chip: "bg-gradient-to-b from-[#F7D77A] to-[#E5B54A] text-[#0A0B0D]",
    avatarRing: "ring-white/70",
    avatarSize: 88,
    nameSize: "text-xl",
  },
  2: {
    chip: "bg-gradient-to-b from-[#EAEEF3] to-[#C9D1DB] text-[#0A0B0D]",
    avatarRing: "ring-white/50",
    avatarSize: 68,
    nameSize: "text-lg",
  },
  3: {
    chip: "bg-gradient-to-b from-[#F0D2B2] to-[#D8A26A] text-[#0A0B0D]",
    avatarRing: "ring-white/50",
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
      {/* Top Header & live strip — no card, the blue podium is the only solid */}
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Own Gang · Leaderboard</p>
          <PageHeading className="mt-2 max-w-2xl" outline="Who ranks the highest.">
            Who holds the most.
          </PageHeading>
          <p className="mt-4 max-w-md text-sm leading-6 text-black/60">
            Gang status is earned, not claimed. Every verified gang, ranked live across chains.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 lg:justify-end lg:pb-1">
          <LiveFigure label="Gangs" value={leaderboard.length.toLocaleString()} />
          <LiveFigure label="Total score" value={formatCompactNumber(totalScore)} />
          <LiveFigure label="NFTs" value={formatCompactNumber(totalNfts)} />
          <span className="inline-flex items-center gap-1.5 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-emerald-600">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
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
                  className={`group relative flex flex-col items-center overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-[#2B3BFF] via-[#0000FF] to-[#0000C8] px-5 pb-6 pt-9 text-center text-white shadow-[0_18px_40px_rgba(10,11,13,0.22)] ring-1 ring-black/10 ${PEDESTAL_HEIGHT[place]} ${
                    profile.xHandle ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
                  {/* bottom fade into the page — the slab grows out of the lavender */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0000C8]/40 to-transparent" />
                  {/* inner top highlight — the 1px light line that makes it feel printed, not flat */}
                  <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
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
                          className="transition hover:underline"
                        >
                          {profile.xName || `@${profile.xHandle}`}
                        </Link>
                      ) : (
                        `@${profile.xHandle}`
                      )}
                    </h2>
                    {profile.profileRole === "agent" ? (
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-white">
                        Agent
                      </span>
                    ) : null}
                  </div>
                  <p className="relative text-xs text-white/70">
                    {profile.xName ? `@${profile.xHandle}` : "Wallet verified"}
                  </p>

                  <p className="font-orbitron relative mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Score
                  </p>
                  <p className="font-orbitron relative mt-1 text-3xl font-bold leading-none tracking-tight">
                    {formatCompactNumber(profile.score)}
                  </p>
                  <div className="relative mt-3 flex items-center gap-4 text-xs font-semibold text-white/80">
                    <span>{profile.nftCount.toLocaleString()} NFT</span>
                    <span className="h-3 w-px bg-white/30" aria-hidden="true" />
                    <span>{profile.badgeCount.toLocaleString()} badge</span>
                  </div>
                </article>
                </SlideIn>
              );
            })}
          </section>

          {/* Personal standing pill */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-5 py-2.5 text-sm text-black/70 shadow-[0_10px_28px_rgba(10,11,13,0.12)] backdrop-blur">
              <span className="inline-block size-2 rounded-full bg-baseblue" aria-hidden="true" />
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

      {/* Main Culture Board — floating cards, lavender gaps so each row pops in 3D */}
      <section>
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-4">
          <div>
            <h2 className="font-semibold text-black/88">Culture board</h2>
            <p className="mt-1 text-sm text-black/65">
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
                className="w-full rounded-xl border border-black/10 bg-white/85 px-3.5 py-1.5 text-xs text-ink shadow-sm backdrop-blur placeholder:text-black/50 focus:border-baseblue focus:outline-none focus:ring-1 focus:ring-baseblue"
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
        <div className="flex items-center justify-between px-1 py-3 sm:hidden">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Swipe table</span>
          <span className="text-sm text-baseblue" aria-hidden="true">-&gt;</span>
        </div>

        {/* Mobile ranking cards — floating, one card per gang */}
        <ol className="space-y-2.5 sm:hidden">
          {tableRows.map((profile, index) => {
            const hasGain = (profile.recentPointsDelta ?? 0) > 0 && profile.score > 0;
            const hasDrop = (profile.recentPointsDelta ?? 0) < 0 && profile.score > 0;
            const isMe = !!(myHandle && profile.xHandle && profile.xHandle.toLowerCase() === myHandle.toLowerCase());

            return (
              <li
                key={`m-${profile.xHandle || index}`}
                onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
                className={`flex items-center gap-3 rounded-2xl border bg-white/90 px-4 py-3.5 shadow-[0_2px_10px_rgba(10,11,13,0.06)] backdrop-blur transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(10,11,13,0.10)] ${
                  isMe
                    ? "border-[#0000FF]/30 ring-1 ring-inset ring-[#0000FF]/25"
                    : "border-black/[0.07]"
                } ${profile.xHandle ? "cursor-pointer" : ""}`}
              >
                <span className={`inline-flex min-w-11 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                  isMe ? "bg-[#0000FF] text-white shadow-sm" : "bg-black/[0.04] text-black/70"
                }`}>
                  {profile.rank ? `#${profile.rank}` : "-"}
                </span>
                <XAvatar src={profile.xAvatar} handle={profile.xHandle} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-black/85">@{profile.xHandle}</p>
                    {isMe ? (
                      <span className="rounded-full bg-[#0000FF] px-1.5 py-0.2 text-[0.6rem] font-black uppercase tracking-wider text-white">
                        YOU
                      </span>
                    ) : null}
                    {profile.profileRole === "agent" ? (
                      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.62rem] font-bold uppercase text-black/60">
                        Agent
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-black/45">
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
                  <span className="rounded-full bg-baseblue px-2.5 py-0.5 text-xs font-bold text-white">
                    {formatCompactNumber(profile.score)}
                  </span>
                  {hasGain && profile.recentPointsDelta ? (
                    <span className="text-[0.65rem] font-bold text-emerald-600">
                      ▲ {formatCompactNumber(profile.recentPointsDelta)}
                    </span>
                  ) : null}
                  {hasDrop && profile.recentPointsDelta ? (
                    <span className="text-[0.65rem] font-bold text-rose-600">
                      ▼ {formatCompactNumber(profile.recentPointsDelta)}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
          {tableRows.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-black/55">
              {searchQuery
                ? `No profiles matching "${searchQuery}"`
                : leaderboard.length > 0
                  ? "The top 3 are featured above."
                  : "No scored profiles yet."}
            </li>
          ) : null}
        </ol>

        {/* Rankings as floating cards (desktop) — one card per gang, gaps show the lavender */}
        <div className="hidden sm:block">
          <ol className="space-y-2.5">
            {tableRows.map((profile, index) => {
              const hasGain = (profile.recentPointsDelta ?? 0) > 0 && profile.score > 0;
              const hasDrop = (profile.recentPointsDelta ?? 0) < 0 && profile.score > 0;
              const isMe = !!(myHandle && profile.xHandle && profile.xHandle.toLowerCase() === myHandle.toLowerCase());

              return (
                <li
                  key={profile.xHandle || index}
                  onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-4 rounded-2xl border bg-white/90 px-5 py-3.5 shadow-[0_2px_10px_rgba(10,11,13,0.06)] backdrop-blur transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(10,11,13,0.10)] ${
                    isMe
                      ? "border-[#0000FF]/30 ring-1 ring-inset ring-[#0000FF]/25"
                      : "border-black/[0.07]"
                  } ${profile.xHandle ? "cursor-pointer" : ""}`}
                >
                  {/* Rank */}
                  <span className={`inline-flex min-w-12 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                    isMe ? "bg-[#0000FF] text-white shadow-sm" : "bg-black/[0.04] text-black/70"
                  }`}>
                    {profile.rank ? `#${profile.rank}` : "-"}
                  </span>

                  {/* X / Profile */}
                  <div className="flex min-w-0 items-center gap-3">
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
                        {isMe ? (
                          <span className="rounded-full bg-[#0000FF] px-1.5 py-0.2 text-[0.6rem] font-black uppercase tracking-wider text-white">
                            YOU
                          </span>
                        ) : null}
                        {profile.profileRole === "agent" ? (
                          <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-black/60">
                            Agent
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-black/45">
                        <span>{profile.nftCount.toLocaleString()} NFTs</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1" title="Indexed on Base, ETH, Robinhood & Solana">
                          <span className="size-1.5 rounded-full bg-[#0000FF]" />
                          <span className="size-1.5 rounded-full bg-[#627EEA]" />
                          <span className="size-1.5 rounded-full bg-[#00C805]" />
                          <span className="size-1.5 rounded-full bg-[#9945FF]" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NFT */}
                  <span className="min-w-14 text-center font-semibold text-black/76">
                    {profile.nftCount.toLocaleString()}
                    <span className="block text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/35">NFT</span>
                  </span>

                  {/* Badge */}
                  <span className="min-w-14 text-center font-semibold text-black/76">
                    {profile.badgeCount.toLocaleString()}
                    <span className="block text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black/35">Badge</span>
                  </span>

                  {/* Score & ▲ +X pts */}
                  <div className="flex min-w-28 items-center justify-end gap-2.5">
                    <span className="rounded-full bg-baseblue px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {formatCompactNumber(profile.score)}
                    </span>

                    {hasGain && profile.recentPointsDelta ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                        title={`Score increased by +${profile.recentPointsDelta.toLocaleString()} points`}
                      >
                        <span className="text-[0.68rem]">▲</span>
                        <span>+{formatCompactNumber(profile.recentPointsDelta)}</span>
                      </span>
                    ) : null}

                    {hasDrop && profile.recentPointsDelta ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700"
                        title={`Score decreased by ${profile.recentPointsDelta.toLocaleString()} points`}
                      >
                        <span className="text-[0.68rem]">▼</span>
                        <span>{formatCompactNumber(profile.recentPointsDelta)}</span>
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}

            {tableRows.length === 0 ? (
              <li className="rounded-2xl border border-black/[0.07] bg-white/90 px-6 py-12 text-center text-black/55 shadow-[0_2px_10px_rgba(10,11,13,0.06)]">
                {searchQuery
                  ? `No profiles matching "${searchQuery}"`
                  : leaderboard.length > 0
                    ? "The top 3 are featured above."
                    : "No scored profiles yet."}
              </li>
            ) : null}
          </ol>
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

function LiveFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-black/40">{label}</p>
      <p className="font-orbitron mt-1 text-2xl font-bold leading-none tracking-tight text-ink lg:text-3xl">
        {value}
      </p>
    </div>
  );
}
