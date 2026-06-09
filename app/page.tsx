import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PixelField } from "@/components/pixel-field";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[#f7f8fb]">
      <PixelField />
      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-9 px-5 py-8 md:grid-cols-[0.88fr_1.12fr] md:items-center lg:px-8">
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 border border-[#0000ff]/15 bg-white/70 px-3 py-2 text-[0.68rem] font-semibold uppercase text-[#0000ff]/80 shadow-sm backdrop-blur">
            <span className="h-2 w-2 bg-[#0000ff]" />
            Base NFT social score
          </div>

          <h1 className="font-display text-[clamp(3.25rem,6.2vw,5.8rem)] font-semibold leading-[0.94] text-black/88">
            Own status.
            <br />
            Prove culture.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-black/58">
            OG-Block links your X identity, verified Base wallet, and NFT holdings into a score people can see, compete for, and use for rewards.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="focus-ring bg-[#0000ff] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(0,0,255,0.18)] hover:bg-[#0018d8]"
              href={session ? "/dashboard" : "/login"}
            >
              {session ? "Open dashboard" : "Start with X"}
            </Link>
            <Link
              className="focus-ring border border-black/12 bg-white/72 px-5 py-3 text-sm font-semibold text-black/78 shadow-sm backdrop-blur hover:border-black/30"
              href="/leaderboard"
            >
              View leaderboard
            </Link>
          </div>
        </div>

        <div className="relative z-10 min-h-[430px] md:min-h-[520px]">
          <div className="culture-frame absolute right-0 top-0 h-full w-[96%] border border-black/10 bg-white/38 shadow-[0_38px_110px_rgba(0,0,255,0.10)] backdrop-blur-2xl">
            <div className="absolute inset-3 overflow-hidden bg-white">
              <Image
                className="h-full w-full object-cover grayscale opacity-90"
                src="/og-nft-grid.png"
                alt="OG-Block NFT collection preview"
                width={1776}
                height={864}
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,248,251,0.58),transparent_26%,transparent_76%,rgba(0,0,255,0.09))]" />
            </div>
          </div>

          <div className="absolute left-4 top-8 border border-black/10 bg-white/76 p-3 shadow-[0_22px_70px_rgba(0,0,0,0.10)] backdrop-blur-xl">
            <Image src="/og-block-logo.png" alt="OG-Block logo" width={84} height={84} priority />
          </div>

          <div className="absolute bottom-8 left-0 grid w-[min(420px,86vw)] grid-cols-3 border border-black/10 bg-white/76 shadow-[0_24px_80px_rgba(0,0,255,0.11)] backdrop-blur-xl">
            <Metric label="Score" value="250" />
            <Metric label="Rank" value="#12" />
            <Metric label="Status" value="OG" />
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-4 grid max-w-7xl gap-px border-y border-black/10 bg-black/10 md:grid-cols-5">
        {[
          ["Membership", "NFT as identity access"],
          ["Score", "Social status from holdings"],
          ["Leaderboard", "Competition by rank"],
          ["X visibility", "Badge where culture lives"],
          ["Rewards", "Roles and allowlists"]
        ].map(([title, copy]) => (
          <div key={title} className="bg-white/70 p-4 backdrop-blur">
            <h2 className="text-sm font-semibold text-black">{title}</h2>
            <p className="mt-2 text-xs leading-5 text-black/58">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-black/10 p-4 last:border-r-0">
      <p className="text-[0.68rem] font-semibold uppercase text-[#0000ff]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-black">{value}</p>
    </div>
  );
}
