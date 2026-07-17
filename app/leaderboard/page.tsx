import Image from "next/image";
import { getLeaderboard } from "@/lib/public-profiles";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();
  const featuredProfiles = leaderboard.slice(0, 3);
  const totalNfts = leaderboard.reduce((total, profile) => total + profile.nftCount, 0);
  const totalBadges = leaderboard.reduce((total, profile) => total + profile.badgeCount, 0);
  const topScore = leaderboard[0]?.score ?? 0;

  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-4 py-12 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,82,255,0.14),transparent_30%),linear-gradient(90deg,rgba(0,82,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <section className="relative mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-baseblue">Leaderboard</p>
            <h1 className="mt-4 max-w-3xl text-[clamp(3rem,6vw,5.8rem)] font-semibold leading-[0.95] tracking-tight text-black/90">
              Verified culture profiles ranked by score.
            </h1>
          </div>

          <div className="rounded-[1.5rem] border border-black/10 bg-white/78 p-5 shadow-sm backdrop-blur">
            <p className="text-sm leading-6 text-black/60">
              The main playground for OG-Block status: verified X profiles, NFT count, OG-Block badges, and culture score in one public board.
            </p>
            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-black/10 text-center">
              <HeroStat label="Profiles" value={leaderboard.length} />
              <HeroStat label="Top score" value={topScore} />
              <HeroStat label="NFTs" value={totalNfts} />
            </div>
          </div>
        </div>

        {featuredProfiles.length > 0 ? (
          <section className="mt-10 grid gap-4 lg:grid-cols-3">
            {featuredProfiles.map((profile, index) => (
              <article
                key={`featured-${profile.xHandle || index}`}
                className={`relative overflow-hidden rounded-[1.5rem] border bg-white p-5 shadow-sm ${index === 0 ? "border-baseblue/25 shadow-[0_10px_28px_rgba(0,82,255,0.08)]" : "border-black/10"}`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-baseblue" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={profile.xAvatar} handle={profile.xHandle} size={48} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-baseblue">Rank #{profile.rank || index + 1}</p>
                      <h2 className="mt-1 font-semibold text-black/88">@{profile.xHandle}</h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-baseblue/10 px-3 py-1 text-xs font-bold text-baseblue">
                    {profile.score} pts
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniStat label="NFT" value={profile.nftCount} />
                  <MiniStat label="Badge" value={profile.badgeCount} />
                  <MiniStat label="Score" value={profile.score} />
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
            <div>
              <h2 className="font-semibold text-black/88">Culture board</h2>
              <p className="mt-1 text-sm text-black/50">Rank, X profile, NFT count, badge count, and score.</p>
            </div>
            <div className="rounded-full border border-baseblue/15 bg-baseblue/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-baseblue">
              Badges {totalBadges}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Swipe table</span>
            <span className="text-sm text-baseblue" aria-hidden="true">-&gt;</span>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-black/[0.03] text-black/55">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">Rank</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">X</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">NFT</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">Badge</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-[0.12em]">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {leaderboard.map((profile, index) => (
                  <tr key={profile.xHandle || index} className="transition hover:bg-baseblue/[0.025]">
                    <td className="px-5 py-4">
                      <span className="inline-flex min-w-12 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-bold text-black/70">
                        {profile.rank ? `#${profile.rank}` : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={profile.xAvatar} handle={profile.xHandle} size={34} />
                        <div>
                          <p className="font-semibold text-black/85">@{profile.xHandle}</p>
                          <p className="text-xs text-black/40">Verified profile</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-black/76">{profile.nftCount}</td>
                    <td className="px-5 py-4 font-semibold text-black/76">{profile.badgeCount}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-baseblue px-3 py-1 text-xs font-bold text-white">
                        {profile.score}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-black/55" colSpan={5}>
                      No scored profiles yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-black/10 bg-white/70 px-4 py-3 last:border-r-0">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-black/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-black/88">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-[#fbfcff] p-3 text-center">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/40">{label}</p>
      <p className="mt-1 font-semibold text-black/88">{value}</p>
    </div>
  );
}

function Avatar({ src, handle, size }: { src: string | null; handle: string; size: number }) {
  if (src) {
    return <Image className="rounded-full" src={src} alt="" width={size} height={size} />;
  }

  return (
    <div className="grid rounded-full bg-baseblue font-semibold text-white" style={{ width: size, height: size, placeItems: "center" }}>
      {handle.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}
