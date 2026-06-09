import { getLeaderboard } from "@/lib/public-profiles";

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-baseblue">Leaderboard</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">OG rank by verified Base NFT score</h1>
      </div>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
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
                <td className="px-4 py-3">@{profile.xHandle}</td>
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
      </section>
    </main>
  );
}
