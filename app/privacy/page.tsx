import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | OG BLOCK",
  description: "Privacy policy for OG BLOCK and the Base Culture Score Chrome extension."
};

const sections = [
  {
    title: "Information we use",
    body: [
      "OG BLOCK lets users connect an X account and a Base wallet to calculate and display a public culture score.",
      "When you use the website, we may store your X handle, connected wallet address, score, rank, OG status, and timestamps needed to keep your profile current.",
      "The Chrome extension reads the current x.com profile URL in your browser so it can request public score data for that handle."
    ]
  },
  {
    title: "How the extension works",
    body: [
      "The extension calls the OG BLOCK profile API to fetch public score, rank, and OG status for visible X profiles.",
      "The extension does not read private messages, post content, passwords, cookies, payment information, or browsing history outside the x.com pages where it runs.",
      "The extension stores only its settings, such as the backend URL and whether debug mode is enabled, using Chrome extension storage."
    ]
  },
  {
    title: "How we use information",
    body: [
      "We use the information to verify profile ownership, calculate NFT-based scores, show leaderboard rankings, and display score badges on supported X profiles.",
      "We do not sell personal information. We do not use extension data for advertising."
    ]
  },
  {
    title: "Public data",
    body: [
      "Scores, ranks, OG status, X handles, and public profile pages may be visible to other users through the website, leaderboard, API, and browser extension.",
      "Wallet NFT ownership may be checked through public blockchain or NFT provider APIs."
    ]
  },
  {
    title: "Third-party services",
    body: [
      "OG BLOCK may rely on X authentication, Supabase, Vercel, Base blockchain data, and NFT provider APIs to operate the website and scoring system.",
      "Those services process data according to their own privacy policies."
    ]
  },
  {
    title: "Data removal",
    body: [
      "If you want your OG BLOCK profile data removed or corrected, contact us with your X handle and connected wallet address.",
      "Removing the Chrome extension from Chrome deletes the extension from your browser. You may also clear its stored settings from Chrome."
    ]
  },
  {
    title: "Contact",
    body: [
      "For privacy questions or removal requests, contact the OG BLOCK team through the project owner or official support channel listed on the Chrome Web Store listing."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0000FF]">Privacy</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#0A0B0D] sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#0A0B0D]/58">Last updated: July 5, 2026</p>
        <p className="mt-6 text-base leading-8 text-[#0A0B0D]/64">
          This policy explains how OG BLOCK and the Base Culture Score Chrome extension handle data.
          It is written for users and for Chrome Web Store review.
        </p>

        <div className="mt-10 divide-y divide-[rgba(10,11,13,0.1)] border-y border-[rgba(10,11,13,0.1)]">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-xl font-semibold text-[#0A0B0D]">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-[#0A0B0D]/62">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/">
            Back home
          </Link>
          <Link className="btn-secondary" href="/leaderboard">
            View leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
