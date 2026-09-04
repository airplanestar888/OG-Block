import { getLeaderboard } from "@/lib/public-profiles";
import { LeaderboardView } from "@/components/leaderboard-view";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="aurora-backdrop relative min-h-screen overflow-hidden px-4 py-12 text-white">
      {/* Mega-word backdrop — culture poster treatment in aurora light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex select-none justify-center overflow-hidden pt-6"
      >
        <span
          className="font-syne whitespace-nowrap text-[min(20vw,15rem)] font-extrabold leading-none text-transparent"
          style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.14)" }}
        >
          GANGS
        </span>
      </div>

      <section className="relative mx-auto max-w-6xl">
        <LeaderboardView leaderboard={leaderboard} />
      </section>
    </main>
  );
}



