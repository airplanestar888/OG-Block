import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Roadmap | OG-Block",
  description: "The OG-Block roadmap from the current Q2 cycle through the next Q2 release window."
};

const roadmap = [
  {
    quarter: "Q2",
    label: "Now",
    title: "Human and agent registration",
    summary: "Stabilize the core loop where regular holders and Virtual IO / ACP agents can register, verify separate human and agent wallet slots, and become minting-ready.",
    items: [
      "Let users choose Human Holder or Agent Profile inside the dashboard.",
      "Separate human wallet and agent wallet verification into two slots.",
      "Expose profile role through public profile APIs and the browser extension.",
      "Improve wallet verification reliability and score refresh flow.",
      "Prepare score versioning schema so future snapshots can be trusted."
    ]
  },
  {
    quarter: "Q3",
    label: "Snapshot season",
    title: "Genesis snapshot and proof history",
    summary: "Move from live score only into historical score moments that can be referenced, compared, and rewarded.",
    items: [
      "Create the first Genesis score snapshot for verified humans and agents.",
      "Store score inputs, rank, NFT count, OG status, profile role, and timestamp per snapshot.",
      "Add snapshot history to dashboard and profile views.",
      "Introduce snapshot eligibility rules for badges and allowlists.",
      "Publish transparent scoring notes so holders understand why ranks move."
    ]
  },
  {
    quarter: "Q4",
    label: "Badge mint",
    title: "Mintable NFT badges and community utility",
    summary: "Turn important score moments into collectible proof badges that can unlock roles, perks, and future drops.",
    items: [
      "Launch Genesis Badge mint for eligible human and agent profiles.",
      "Add badge claim status, mint windows, and profile eligibility checks.",
      "Connect badges to community roles, gated channels, or partner allowlists.",
      "Support seasonal badge designs for future score snapshots.",
      "Improve anti-spam and duplicate-wallet handling around badge claims."
    ]
  },
  {
    quarter: "Q1",
    label: "Agent layer",
    title: "Agent wallet slots and delegated culture actions",
    summary: "Separate identity wallets from action wallets so holders can safely assign bots, agents, or operators without losing identity ownership.",
    items: [
      "Design wallet slots for identity wallet, vault wallet, and agent wallet.",
      "Add signed delegation rules for what an agent wallet can do.",
      "Expose agent wallet status on dashboard without changing public identity.",
      "Create safety controls for revoking or rotating agent slots.",
      "Test agent use cases for campaign participation, claims, and automation."
    ]
  },
  {
    quarter: "Q2",
    label: "Next cycle",
    title: "Season two reputation network",
    summary: "Use snapshots, badges, and delegated wallets as a base for a broader reputation layer across Base culture.",
    items: [
      "Release Season Two scoring with snapshot-to-snapshot comparison.",
      "Add richer public holder pages with badges, rank history, and wallet slots.",
      "Open partner collection modules for more Base NFT communities.",
      "Build admin tools for snapshot creation, eligibility review, and badge campaigns.",
      "Prepare APIs for apps, bots, and extensions to read reputation safely."
    ]
  }
];

const principles = [
  "Score must be explainable, not magic.",
  "Snapshots should preserve history, not rewrite it.",
  "Badges should prove moments, not just decorate profiles.",
  "Agent wallets should add utility without exposing the main identity wallet."
];

export default function RoadmapPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,82,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,82,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,82,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />

      <section className="relative mx-auto max-w-6xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Roadmap</p>
        <div className="mt-5 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <h1 className="text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.95] text-black/88">
              From score,
              <br />
              to snapshot,
              <br />
              to badge.
            </h1>
          </div>
          <div className="max-w-2xl lg:pb-2">
            <p className="text-base leading-8 text-black/60">
              OG-Block starts as a visible Base culture score for humans and agents, then grows into a versioned reputation system. Because the current build is already inside the Q2 cycle, this roadmap runs from this Q2 through the next Q2: registration, Genesis snapshot, mintable badges, agent wallet slots, and the next reputation network release.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="bg-baseblue px-5 py-3 text-sm font-semibold text-white" href="/dashboard">
                Open dashboard
              </Link>
              <Link className="border border-black/15 bg-white/70 px-5 py-3 text-sm font-semibold text-black/78" href="/leaderboard">
                View leaderboard
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-px border border-black/10 bg-black/10 lg:grid-cols-5">
          {roadmap.map((phase) => (
            <article key={`${phase.quarter}-${phase.label}`} className="flex min-h-[28rem] flex-col bg-white/78 p-5 backdrop-blur">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-3xl font-semibold leading-none text-baseblue">{phase.quarter}</p>
                  <span className="border border-baseblue/20 bg-baseblue/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-baseblue">
                    {phase.label}
                  </span>
                </div>
                <h2 className="mt-6 text-xl font-semibold leading-tight text-black/88">{phase.title}</h2>
                <p className="mt-3 text-sm leading-6 text-black/58">{phase.summary}</p>
              </div>

              <ul className="mt-6 space-y-3 border-t border-black/10 pt-5">
                {phase.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-black/68">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-baseblue" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="mt-12 grid gap-6 border-t border-black/10 pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Product direction</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight text-black/88 sm:text-4xl">
              Reputation should become portable culture proof.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {principles.map((principle) => (
              <div key={principle} className="flex min-h-20 items-center gap-3 border border-black/10 bg-white/74 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.035)] backdrop-blur">
                <span className="h-2 w-2 shrink-0 rounded-full bg-baseblue" />
                <span className="text-sm font-semibold leading-6 text-black/72">{principle}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
