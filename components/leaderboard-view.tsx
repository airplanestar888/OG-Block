"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { XAvatar } from "@/components/x-avatar";
import type { PublicLeaderboardProfile } from "@/lib/types";

type LeaderboardViewProps = {
  leaderboard: PublicLeaderboardProfile[];
};

function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}M`;
  }
  if (absValue >= 1_000) {
    const formatted = (value / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}K`;
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

export function LeaderboardView({ leaderboard }: LeaderboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

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
      {featuredProfiles.length > 0 && !searchQuery ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {featuredProfiles.map((profile, index) => (
            <article
              key={`featured-${profile.xHandle || index}`}
              onClick={() => profile.xHandle && router.push(`/u/${profile.xHandle}`)}
              className={`relative overflow-hidden rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                profile.xHandle ? "cursor-pointer" : ""
              } ${
                index === 0
                  ? "border-baseblue/25 shadow-[0_10px_28px_rgba(0,0,255,0.08)]"
                  : "border-black/10"
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-baseblue" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <XAvatar src={profile.xAvatar} handle={profile.xHandle} size={48} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">
                        Rank #{profile.rank || index + 1}
                      </p>
                      {profile.profileRole === "agent" ? (
                        <span className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-black/60">
                          Agent
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-1 font-semibold text-black/88">
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
                    </h2>
                  </div>
                </div>

                <span className="rounded-full bg-baseblue/10 px-3 py-1 text-xs font-bold text-baseblue">
                  {formatCompactNumber(profile.score)} pts
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <MiniStat label="NFT" value={profile.nftCount.toLocaleString()} />
                <MiniStat label="Badge" value={profile.badgeCount.toLocaleString()} />
                <MiniStat label="Score" value={formatCompactNumber(profile.score)} />
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {/* Main Culture Board */}
      <section className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
        {/* Table Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <h2 className="font-semibold text-black/88">Culture board</h2>
            <p className="mt-1 text-sm text-black/65">Live rankings across all verified OG BLOCK profiles.</p>
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
                <th className="w-[38%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">X</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">NFT</th>
                <th className="w-[15%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">Badge</th>
                <th className="w-[22%] px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.12em]">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredProfiles.map((profile, index) => {
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
                    <td className="px-6 py-4 text-center">
                      <div className="mx-auto flex w-fit items-center gap-3 text-left">
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
                          <p className="text-xs text-black/40">Wallet verified</p>
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

              {filteredProfiles.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-black/55" colSpan={5}>
                    {searchQuery ? `No profiles matching "${searchQuery}"` : "No scored profiles yet."}
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-3 text-center">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/55">{label}</p>
      <p className="mt-1 font-semibold text-black/88">{value}</p>
    </div>
  );
}

