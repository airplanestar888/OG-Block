"use client";

import { useState } from "react";
import Link from "next/link";
import { shortAddress } from "@/lib/address";

export type DashboardHolding = {
  contractAddress: string;
  tokenId: string;
  chain: "Base" | "Ethereum" | "Robinhood" | "Solana";
  creatorLabel: string;
  creatorAddress?: string;
  traits: string;
  scoreTotal: number;
  scoreParts: Array<{ label: string; points: number }>;
  explorerUrl: string;
};

type Props = {
  holdings: DashboardHolding[];
};

const CHAINS = ["All", "Base", "Ethereum", "Robinhood", "Solana"] as const;
type ChainTab = typeof CHAINS[number];

const CHAIN_DOTS: Record<string, string> = {
  Base: "bg-[#0000FF]",
  Ethereum: "bg-[#627EEA]",
  Robinhood: "bg-[#00C805]",
  Solana: "bg-[#9945FF]"
};

export function DashboardPortfolioFilter({ holdings }: Props) {
  const [activeTab, setActiveTab] = useState<ChainTab>("All");

  const counts: Record<ChainTab, number> = {
    All: holdings.length,
    Base: holdings.filter((h) => h.chain === "Base").length,
    Ethereum: holdings.filter((h) => h.chain === "Ethereum").length,
    Robinhood: holdings.filter((h) => h.chain === "Robinhood").length,
    Solana: holdings.filter((h) => h.chain === "Solana").length
  };

  const filtered = activeTab === "All" ? holdings : holdings.filter((h) => h.chain === activeTab);

  return (
    <div className="space-y-5">
      {/* Chain Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-black/10 pb-3">
        {CHAINS.map((tab) => {
          const count = counts[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "bg-black/[0.04] text-black/65 hover:bg-black/[0.08] hover:text-ink"
              }`}
            >
              {tab !== "All" && (
                <span className={`size-1.5 rounded-full ${CHAIN_DOTS[tab] || "bg-baseblue"}`} />
              )}
              <span>{tab}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-black/10 text-black/60"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Holding cards */}
      <div className="grid gap-3">
        {filtered.map((holding, index) => (
          <article
            key={`${holding.contractAddress}-${holding.tokenId}`}
            className="grid gap-4 rounded-xl border border-black/10 bg-white p-4 transition-all hover:border-black/20 hover:shadow-sm md:grid-cols-[1fr_auto]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-black px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  Item {index + 1}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-[#f7f8fb] px-2.5 py-0.5 text-[0.68rem] font-bold text-black/70">
                  <span className={`size-1.5 rounded-full ${CHAIN_DOTS[holding.chain] || "bg-baseblue"}`} />
                  {holding.chain}
                </span>

                {holding.creatorLabel !== "Unknown creator" ? (
                  holding.creatorAddress ? (
                    <Link
                      className="text-xs font-semibold text-ink hover:text-baseblue"
                      href={`https://basescan.org/address/${holding.creatorAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Creator: {holding.creatorLabel}
                    </Link>
                  ) : (
                    <h3 className="text-xs font-semibold text-ink">Creator: {holding.creatorLabel}</h3>
                  )
                ) : null}
              </div>

              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div className="space-y-0.5">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/45">Contract</dt>
                  <dd className="font-mono text-xs text-ink">{shortAddress(holding.contractAddress) || "-"}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/45">Token ID</dt>
                  <dd className="font-mono text-xs text-ink">{holding.tokenId}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-black/45">Traits</dt>
                  <dd className="text-xs text-ink">{holding.traits || "Standard"}</dd>
                </div>
              </dl>

              <Link
                className="btn-secondary mt-4 h-9 px-4 text-xs"
                href={holding.explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>View On-Chain</span>
                <span>→</span>
              </Link>
            </div>

            <div className="min-w-52 rounded-xl border border-black/10 bg-[#fbfcff] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-baseblue">Score impact</p>
              <p className="mt-1 text-2xl font-semibold text-ink">+{holding.scoreTotal}</p>
              <div className="mt-2 space-y-1">
                {holding.scoreParts.map((part) => (
                  <div key={part.label} className="flex justify-between gap-3 text-[0.75rem] text-black/60">
                    <span>{part.label}</span>
                    <span className="font-semibold text-ink">+{part.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 bg-[#fbfcff] px-4 py-12 text-center text-sm text-black/50">
            <p className="font-semibold text-ink">No verified NFTs on {activeTab}</p>
            <p className="mt-1 text-xs text-black/45">
              Verified holdings across Base, Ethereum, Robinhood, and Solana are automatically indexed into your Culture Score.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
