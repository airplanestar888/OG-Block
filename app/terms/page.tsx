import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | OG BLOCK",
  description: "Terms of service for OG BLOCK and the Base Culture Score tools."
};

const sections = [
  {
    title: "Acceptance of terms",
    body: [
      "By using OG BLOCK, its website, API, or the Base Culture Score Chrome extension, you agree to these terms.",
      "If you do not agree, do not use the service."
    ]
  },
  {
    title: "What OG BLOCK is",
    body: [
      "OG BLOCK lets users connect an X account and a Base wallet to calculate and display a public culture score, rank, and OG status.",
      "Scores are derived from public on-chain NFT ownership and are provided for informational and entertainment purposes only."
    ]
  },
  {
    title: "No financial advice",
    body: [
      "OG BLOCK does not provide financial, investment, or legal advice. Scores, ranks, and badges are not an endorsement of any token, NFT, or project.",
      "You are solely responsible for any on-chain transactions you make, including minting the OG Card. Blockchain transactions are irreversible."
    ]
  },
  {
    title: "Acceptable use",
    body: [
      "You agree not to abuse, disrupt, or attempt to gain unauthorized access to the service, its API, or other users' data.",
      "You agree not to use the service for unlawful activity or to misrepresent your identity or holdings."
    ]
  },
  {
    title: "Wallets and ownership",
    body: [
      "You are responsible for securing your wallet and private keys. OG BLOCK never has custody of your funds or NFTs.",
      "Verifying a wallet only proves control of that address for scoring purposes."
    ]
  },
  {
    title: "Availability and changes",
    body: [
      "The service is provided \"as is\" without warranties of any kind. We may change, suspend, or discontinue any part of the service at any time.",
      "We may update these terms; continued use after changes means you accept the updated terms."
    ]
  },
  {
    title: "Contact",
    body: [
      "For questions about these terms, contact the OG BLOCK team through the official channels listed on the website or Chrome Web Store listing."
    ]
  }
];

export default function TermsPage() {
  return (
    <main className="relative overflow-hidden bg-[#f7f8fb] px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0000FF]">Terms</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#0A0B0D] sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#0A0B0D]/58">Last updated: August 19, 2026</p>
        <p className="mt-6 text-base leading-8 text-[#0A0B0D]/64">
          These terms govern your use of OG BLOCK, its website, API, and the Base Culture Score tools.
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
          <Link className="btn-secondary" href="/privacy">
            Privacy policy
          </Link>
        </div>
      </section>
    </main>
  );
}
