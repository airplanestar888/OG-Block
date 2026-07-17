import Link from "next/link";

const steps = [
  {
    title: "Profile type",
    copy: "A regular holder or Virtual IO / ACP agent registers with X, then chooses how the public profile should be treated."
  },
  {
    title: "Wallet proof",
    copy: "Humans and agents verify separate Base wallet slots, then both wallets feed the same OG score."
  },
  {
    title: "Social score",
    copy: "NFT count, rare traits, early token IDs, and OG allowlist status become a transparent reputation score."
  },
  {
    title: "X visibility",
    copy: "The extension brings score, rank, OG status, and agent identity directly onto X profiles."
  },
  {
    title: "Mint readiness",
    copy: "Verified humans and agents can become eligible for future badge minting, rewards, allowlists, and gated drops."
  }
];

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,82,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,82,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto max-w-6xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">How it works</p>
        <div className="mt-5 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <h1 className="text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.95] text-black/88">
            Proof,
            <br />
            status,
            <br />
            visibility.
          </h1>
          <p className="max-w-xl text-base leading-8 text-black/60">
            OG-Block is a social identity loop for Base NFT culture. Humans and agents verify X, sign separate Base wallet slots, combine NFT holdings into one OG score, prepare for minting, and carry that status into social spaces.
          </p>
        </div>

        <div className="mt-12 grid gap-px border border-black/10 bg-black/10 md:grid-cols-5">
          {steps.map((step, index) => (
            <article key={step.title} className="bg-white/74 p-5 backdrop-blur">
              <p className="text-xs font-bold text-baseblue">0{index + 1}</p>
              <h2 className="mt-5 text-lg font-semibold text-black">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-black/58">{step.copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="bg-baseblue px-5 py-3 text-sm font-semibold text-white" href="/dashboard">
            Open dashboard
          </Link>
          <Link className="border border-black/15 bg-white/70 px-5 py-3 text-sm font-semibold text-black/78" href="/leaderboard">
            View leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
