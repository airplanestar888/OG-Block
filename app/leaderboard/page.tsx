import Image from "next/image";
import { getLeaderboard } from "@/lib/public-profiles";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-baseblue">Leaderboard</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">OG rank by verified Base NFT score</h1>
      </div>

      <section className="rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:hidden">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Swipe table</span>
          <span className="text-sm text-baseblue" aria-hidden="true">-&gt;</span>
        </div>
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-black/[0.03] text-black/60">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">X</th>
                <th className="px-4 py-3 font-medium">Wallet</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">OG</th>
                <th className="px-4 py-3 font-medium">NFTs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {leaderboard.map((profile) => (
                <tr key={profile.xHandle}>
                  <td className="px-4 py-3 font-semibold">{profile.rank ? `#${profile.rank}` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {profile.xAvatar ? (
                        <Image className="rounded-full" src={profile.xAvatar} alt="" width={28} height={28} />
                      ) : (
                        <div className="grid size-7 place-items-center rounded-full bg-baseblue text-xs font-semibold text-white">
                          {profile.xHandle.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span>@{profile.xHandle}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{profile.walletAddress || "-"}</td>
                  <td className="px-4 py-3">{profile.score}</td>
                  <td className="px-4 py-3">{profile.isOg ? <span className="rounded bg-mint/15 px-2 py-1 font-medium text-emerald-700">OG</span> : "-"}</td>
                  <td className="px-4 py-3">{profile.nftCount}</td>
                </tr>
              ))}
              {leaderboard.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-black/55" colSpan={6}>
                    No scored holders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
