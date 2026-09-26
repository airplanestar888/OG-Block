import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "FAQ | OG BLOCK",
  description: "Frequently asked questions about OG BLOCK — scoring, verification, wallets, agent wallets, and badges.",
};

type FaqItem = {
  q: string;
  a: React.ReactNode;
};

const FAQS: FaqItem[] = [
  {
    q: "What is OG BLOCK?",
    a: (
      <>
        OG BLOCK turns your Base NFT holdings into a public <strong>culture score</strong> — verified on-chain, ranked
        live, and visible on X. Connect your X account, verify a Base wallet, and every NFT you hold becomes points and
        status. See <Link className="font-semibold text-baseblue hover:underline" href="/how-it-works">How it works</Link>.
      </>
    ),
  },
  {
    q: "How is the culture score calculated?",
    a: (
      <>
        Only <strong>verified</strong> contracts count. The formula is:{" "}
        <span className="font-mono text-xs">holding ≥1 NFT = 100</span> (once) ·{" "}
        <span className="font-mono text-xs">each additional NFT +25</span> ·{" "}
        <span className="font-mono text-xs">rare trait +50</span> (Background: Based Blue, Status: OG, Edition: Genesis) ·{" "}
        <span className="font-mono text-xs">early token ID &lt;500 +75</span>.{" "}
        <em>Example: 3 NFTs (1 rare, 2 early) = 100 + 50 + 50 + 50 + 75 + 75 = 350 points.</em> Rare and early bonuses
        stack per NFT. Both your main wallet and agent wallet accumulate into the same score.
      </>
    ),
  },
  {
    q: "What do Verified, Unverified, and Spam mean?",
    a: (
      <>
        Every contract is checked via Alchemy + BaseScan. <strong>Verified</strong> (on-chain verified source) counts
        toward your score and always overrides spam. <strong>Unverified</strong> and <strong>Spam</strong> are shown on
        your public profile for transparency but are not counted. The breakdown lives under{" "}
        <span className="font-mono text-xs">NFT overview</span> on each <code className="font-mono text-xs">/u/[handle]</code>{" "}
        profile.
      </>
    ),
  },
  {
    q: "Do I pay gas or give up custody?",
    a: (
      <>
        <strong>1 signature · 0 gas · 100% your custody.</strong> Verifying a wallet only proves you control that address
        for scoring. OG BLOCK never has custody of your funds or NFTs and never moves them. Scores are read from public
        blockchain and NFT provider APIs.
      </>
    ),
  },
  {
    q: "How do I verify a wallet?",
    a: (
      <>
        Sign in with X, then in <Link className="font-semibold text-baseblue hover:underline" href="/dashboard">Dashboard</Link> open the{" "}
        <strong>Wallet</strong> panel and sign a message with your Base wallet (chain{" "}
        <span className="font-mono text-xs">8453</span>). The message includes a single-use nonce and timestamp (±5
        minutes). One X profile supports two slots: <strong>human</strong> (your holder wallet) and{" "}
        <strong>agent</strong> (optional AI agent wallet) — each verified independently.
      </>
    ),
  },
  {
    q: "What is an Agent Wallet?",
    a: (
      <>
        One X profile can have an additional <strong>agent wallet</strong> — a separate wallet owned by an autonomous
        agent. NFTs held in either slot accumulate into one combined score. The flow: operator generates a one-time code
        (<span className="font-mono text-xs">OGB-XXXX-XXXX</span>, single-use, expires in 15 minutes) from the dashboard,
        hands it to the agent, the agent signs the exact challenge with its own key and{" "}
        <span className="font-mono text-xs">POST</span>s to{" "}
        <code className="font-mono text-xs">/api/agent/link</code>. Full instructions at{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/agent-guide">Agent guide</Link>.
      </>
    ),
  },
  {
    q: "What are OG Cards and badge tiers?",
    a: (
      <>
        The <strong>OG Card</strong> is an ERC-721 on Base (
        <span className="font-mono text-xs">0x841b…9e67</span>, max 1000, one per wallet). Tiers by mint order:{" "}
        <strong>Genesis #0–99</strong> (founding status), <strong>Early #100–499</strong>,{" "}
        <strong>Member #500–999</strong>. Claim from{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/og-card">Badge / NFT</Link> when your
        profile is eligible.
      </>
    ),
  },
  {
    q: "How does the leaderboard and public profile work?",
    a: (
      <>
        Rank is by score, highest first, across all verified profiles. The{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/leaderboard">Leaderboard</Link> refreshes
        regularly, and each profile at <code className="font-mono text-xs">/u/[handle]</code> shows score, rank, NFTs,
        status, rare/early breakdown, and contract counts — plus an OG image card for sharing on X.
      </>
    ),
  },
  {
    q: "What are Snapshots and what’s on the roadmap?",
    a: (
      <>
        Snapshots freeze a score moment for badges and allowlists. The{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/roadmap">Roadmap</Link> runs{" "}
        <strong>Q2 Now</strong> (sign-in + wallet proof) → <strong>Q3 Snapshot season</strong> (Genesis snapshot, history) →{" "}
        <strong>Q4 Badge mint</strong> (mintable badges, community utility) → <strong>Q1 Agent layer</strong> (agent
        controls, extension identity) → <strong>Q2 Next cycle</strong> (season-two reputation network).
      </>
    ),
  },
  {
    q: "Does OG BLOCK access my private data?",
    a: (
      <>
        No. OG BLOCK reads only your public X handle/avatar, wallet addresses you verify, and public on-chain NFT
        ownership. It does not read private messages, post content, passwords, cookies, payment info, or browsing history
        outside <span className="font-mono text-xs">x.com</span>. The X extension stores only settings (backend URL, debug
        mode) in Chrome storage. See{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/privacy">Privacy</Link> and{" "}
        <Link className="font-semibold text-baseblue hover:underline" href="/terms">Terms</Link>.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">FAQ</p>
        <div className="mt-2">
          <PageHeading outline="Your questions, answered.">Got questions?</PageHeading>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-7 text-black/60">
          How scoring, verification, wallets, agent wallets, and badges work — grounded in the live product, not promises.
        </p>

        <div className="mt-10 divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left font-semibold text-[#0A0B0D] transition hover:bg-black/[0.02] [&::-webkit-details-marker]:hidden">
                <span className="pr-2 text-[0.95rem] leading-6">{q}</span>
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-xs text-black/60 transition group-open:rotate-180"
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </summary>
              <div className="border-t border-black/10 bg-black/[0.015] px-5 py-4 text-sm leading-7 text-black/70">{a}</div>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/try">
            Try yours — no sign-in
          </Link>
          <Link className="btn-secondary" href="/leaderboard">
            View leaderboard
          </Link>
          <Link className="btn-secondary" href="/how-it-works">
            How it works
          </Link>
        </div>
      </section>
    </main>
  );
}
