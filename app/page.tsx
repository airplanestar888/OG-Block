import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,82,255,0.18),transparent_30%),radial-gradient(circle_at_84%_24%,rgba(0,196,140,0.13),transparent_28%)]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_0.92fr] md:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-baseblue shadow-sm backdrop-blur-xl">
            <span className="size-2 rounded-full bg-mint shadow-[0_0_18px_rgba(0,196,140,0.75)]" />
            Base NFT identity
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
            OG status for Base culture, verified on X.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-black/70">
            Link your X identity, prove wallet ownership, and turn Base NFT holdings into a public score, OG badge, and leaderboard rank.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="focus-ring rounded-md bg-baseblue px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              href={session ? "/dashboard" : "/login"}
            >
              {session ? "Open dashboard" : "Start with X"}
            </Link>
            <Link
              className="focus-ring rounded-md border border-black/10 bg-white/70 px-5 py-3 font-semibold shadow-sm backdrop-blur hover:bg-white"
              href="/leaderboard"
            >
              View leaderboard
            </Link>
          </div>
        </div>

        <div className="relative min-h-[430px]">
          <div className="absolute left-6 top-4 z-10 rounded-lg border border-white/70 bg-white/65 p-4 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl">
            <Image className="rounded-lg" src="/og-block-logo.png" alt="OG-Block logo" width={96} height={96} priority />
          </div>
          <div className="hero-orbit absolute right-2 top-4 h-24 w-24 rounded-full border border-baseblue/20 bg-white/50 backdrop-blur-xl" />
          <div className="glass-panel absolute inset-x-0 bottom-0 top-16 overflow-hidden rounded-lg border border-white/70 bg-white/45 p-3 shadow-2xl shadow-blue-950/15 backdrop-blur-2xl">
            <Image
              className="h-full w-full rounded-md object-cover grayscale"
              src="/og-nft-grid.png"
              alt="OG-Block NFT collection preview"
              width={1776}
              height={864}
              priority
            />
            <div className="absolute inset-3 rounded-md bg-gradient-to-tr from-baseblue/35 via-transparent to-white/25 mix-blend-overlay" />
            <div className="absolute bottom-6 left-6 right-6 rounded-lg border border-white/70 bg-white/70 p-4 shadow-xl backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-baseblue">Live score preview</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">Score 250 - Rank #12</p>
                </div>
                <span className="rounded-md bg-mint px-3 py-2 text-sm font-bold text-white">OG</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-3 px-4 pb-12 md:grid-cols-4">
        {[
          ["X identity", "OAuth login stores handle, display name, and avatar."],
          ["Verified wallet", "Base wallet ownership is proven by signed message."],
          ["NFT score", "Rules are editable in code and calculated only on the backend."],
          ["X extension", "Public rank and OG badge appear directly on profile pages."]
        ].map(([title, copy]) => (
          <div key={title} className="rounded-lg border border-white/70 bg-white/60 p-5 shadow-sm shadow-blue-950/5 backdrop-blur-xl">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-black/65">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
