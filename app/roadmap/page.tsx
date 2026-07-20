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
    title: "Sign in and wallet proof",
    summary: "Stabilize the core loop where one X account becomes one OG-Block profile with a verified wallet and an optional agent wallet plus slot.",
    items: [
      "Use Sign in with X as the only entry point.",
      "Keep one X profile per user, with a main wallet and optional agent wallet.",
      "Let agent wallets verify through agent or console flow, not browser wallet connect.",
      "Improve wallet disconnect, replacement, and score refresh reliability.",
      "Prepare score versioning schema so future snapshots can be trusted."
    ]
  },
  {
    quarter: "Q3",
    label: "Snapshot season",
    title: "Genesis snapshot and proof history",
    summary: "Move from live score only into historical score moments that can be referenced, compared, and rewarded.",
    items: [
      "Create the first Genesis score snapshot for verified wallets and agent wallet plus slots.",
      "Store score inputs, rank, NFT count, badge count, AgentIdentity status, and timestamp per snapshot.",
      "Add snapshot history to dashboard and profile views.",
      "Introduce snapshot eligibility rules for OG-Block badges and allowlists.",
      "Publish transparent scoring notes so holders understand why ranks move."
    ]
  },
  {
    quarter: "Q4",
    label: "Badge mint",
    title: "Mintable NFT badges and community utility",
    summary: "Turn important score moments into collectible proof badges that can unlock roles, perks, and future drops.",
    items: [
      "Launch Genesis Badge mint for eligible verified profiles.",
      "Add Badge field, claim status, mint windows, and profile eligibility checks.",
      "Connect badges to community roles, gated channels, or partner allowlists.",
      "Support seasonal badge designs for future score snapshots.",
      "Keep collection NFTs separate from OG-Block badge and perk proofs."
    ]
  },
  {
    quarter: "Q1",
    label: "Agent layer",
    title: "Agent Wallet Ready",
    summary: "Make agent wallets a clean plus feature for any AI agent while keeping special identity badges, like AgentIdentity, as extension-only proofs.",
    items: [
      "Publish a public agent guide that any AI agent can scan and follow.",
      "Show AgentIdentity-powered Virtual IO only in the X extension when the NFT is actually held.",
      "Expose agent wallet status on dashboard without turning the whole profile into an agent type.",
      "Create safety controls for revoking or rotating agent wallets.",
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
      "Add richer public profile pages with badges, rank history, and wallet proof.",
      "Open partner collection modules for more Base NFT communities.",
      "Build admin tools for snapshot creation, eligibility review, and badge campaigns.",
      "Prepare APIs for apps, bots, and extensions to read reputation safely."
    ]
  }
];

const coreModules = [
  {
    title: "Wallet Proof",
    copy: "One X profile with a verified wallet and optional agent wallet."
  },
  {
    title: "Culture Score",
    copy: "NFT holdings, rank, and score calculated across connected wallets."
  },
  {
    title: "Badges & Perks",
    copy: "OG-Block NFT or perk proofs from campaigns and snapshots."
  },
  {
    title: "X Extension",
    copy: "Display OG-Block score, rank, and AgentIdentity status on X."
  },
  {
    title: "Snapshots",
    copy: "Versioned score moments for eligibility and badge minting."
  },
  {
    title: "Agent Wallet",
    copy: "A plus slot for AI agents to verify, act, and mint when eligible."
  }
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
              Score culture.
              <br />
              Lock the rank.
              <br />
              Own the badge.
            </h1>
          </div>
          <div className="max-w-2xl lg:pb-2">
            <p className="text-base leading-8 text-black/60">
              OG-Block starts as a visible culture score for verified X profiles, then grows into a versioned reputation system. Because the current build is already inside the Q2 cycle, this roadmap runs from this Q2 through the next Q2: sign in, wallet proof, Genesis snapshot, mintable badges, Agent Wallet Ready, and the next reputation network release.
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
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">Core modules</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight text-black/88 sm:text-4xl">
              The product blocks behind OG-Block.
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {coreModules.map((module) => (
              <div key={module.title} className="min-h-28 border border-black/10 bg-white/74 p-4 shadow-[0_1px_8px_rgba(0,0,0,0.035)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-baseblue" />
                  <h3 className="font-semibold text-black/84">{module.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-black/58">{module.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
