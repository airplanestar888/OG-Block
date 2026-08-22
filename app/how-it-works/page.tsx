import Link from "next/link";

const steps = [
  {
    title: "One profile",
    copy: "Sign in with X. One account, one identity. No separate agent or holder types — just your profile."
  },
  {
    title: "Verify your wallet",
    copy: "Sign once with your Base wallet to prove ownership. Add an agent wallet as a plus slot anytime."
  },
  {
    title: "Your score, ranked",
    copy: "Holdings, rare traits, early IDs — all counted and ranked publicly against every verified profile."
  },
  {
    title: "Live on X",
    copy: "Your score and rank appear directly on X profiles. Culture status, visible where it matters."
  },
  {
    title: "Earn the badge",
    copy: "Hit the threshold. Lock the snapshot. Mint the badge that proves you were here early."
  }
];

export default function HowItWorksPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto max-w-6xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">How it works</p>
        <div className="mt-2 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <h1
            className="font-bebas text-[clamp(2.2rem,4.5vw,3.4rem)] font-normal leading-[0.98] text-[#0A0B0D]"
            style={{
              letterSpacing: "0.02em",
            }}
          >
            Proof,
            <br />
            status,
            <br />
            visibility.
          </h1>
          <p className="max-w-xl text-base leading-8 text-black/70">
            OG BLOCK turns your Base NFT holdings into a public rank. Verify once, score everything, and carry that status onto X — where the culture actually is.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-5">
          {steps.map((step, index) => (
            <article key={step.title} className="bg-white/74 p-5 backdrop-blur">
              <p className="text-xs font-bold text-baseblue">0{index + 1}</p>
              <h2 className="mt-5 text-lg font-semibold text-black">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-black/70">{step.copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link className="rounded-full bg-baseblue px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#141CB5] active:opacity-80" href="/og-card">
            Get your badge
          </Link>
          <Link className="rounded-full border border-[rgba(10,11,13,0.12)] bg-white/70 px-5 py-3 text-sm font-semibold text-[#0A0B0D]/65 transition duration-200 hover:border-[rgba(10,11,13,0.26)] hover:text-[#0A0B0D]" href="/leaderboard">
            View leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
