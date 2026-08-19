import { getLeaderboard } from "@/lib/public-profiles";
import { LeaderboardView } from "@/components/leaderboard-view";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8fb] px-4 py-12 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,255,0.14),transparent_30%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <section className="relative mx-auto max-w-6xl">
        <LeaderboardView leaderboard={leaderboard} />
      </section>
    </main>
  );
}



