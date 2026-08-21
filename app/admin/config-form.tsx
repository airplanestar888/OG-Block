"use client";

import { useState } from "react";

type Props = {
  initialContract: string;
  initialChainId: number;
  dbContract: string | null;
  dbChain: string | null;
  initialNftImage: string;
  initialCardImage: string;
  dbNftImage: string | null;
  dbCardImage: string | null;
};

const CHAINS = [
  { id: 8453, label: "Base Mainnet (8453)" },
  { id: 84532, label: "Base Sepolia (84532)" }
];

export function AdminConfigForm({
  initialContract,
  initialChainId,
  dbContract,
  dbChain,
  initialNftImage,
  initialCardImage,
  dbNftImage,
  dbCardImage
}: Props) {
  const [contract, setContract] = useState(initialContract);
  const [chainId, setChainId] = useState(initialChainId);
  const [nftImage, setNftImage] = useState(initialNftImage);
  const [cardImage, setCardImage] = useState(initialCardImage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  async function refreshAllScores() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const res = await fetch("/api/admin/refresh-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setRefreshMsg(
        `Refreshed ${data.refreshed}/${data.total} profiles${data.failed ? ` · ${data.failed} failed` : ""}. Leaderboard updated.`
      );
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress: contract.trim(),
          chainId,
          nftImageUrl: nftImage.trim(),
          cardImageUrl: cardImage.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setContract(data.contractAddress || "");
      setChainId(Number(data.chainId));
      setNftImage(data.nftImageUrl || "");
      setCardImage(data.cardImageUrl || "");
      setMessage("Saved. The application now uses these values immediately.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Smart Contract Settings */}
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ink">OG Card contract</h2>
        <p className="mt-1 text-sm text-black/55">
          The claim page reads these at runtime from the database.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
              Contract address
            </label>
            <input
              className="focus-ring mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 font-mono text-sm text-ink"
              placeholder="0x… (empty = use env fallback)"
              value={contract}
              onChange={(e) => setContract(e.target.value)}
              spellCheck={false}
            />
            <p className="mt-1 text-[0.7rem] text-black/40">
              {dbContract ? "Source: database override" : "Source: env fallback (no DB value yet)"}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
              Chain
            </label>
            <select
              className="focus-ring mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm text-ink"
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
            >
              {CHAINS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[0.7rem] text-black/40">
              {dbChain ? "Source: database override" : "Source: env fallback (no DB value yet)"}
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Storage Image Settings */}
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ink">Supabase Storage Images</h2>
        <p className="mt-1 text-sm text-black/55">
          Host images in Supabase Storage buckets (or any CDN URL) and update them here without redeploying on Vercel.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
              Homepage NFT Grid Image URL
            </label>
            <input
              className="focus-ring mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 font-mono text-sm text-ink"
              placeholder="https://...supabase.co/storage/v1/object/public/... (empty = /og-nft-grid.png)"
              value={nftImage}
              onChange={(e) => setNftImage(e.target.value)}
            />
            <p className="mt-1 text-[0.7rem] text-black/40">
              {dbNftImage ? "Source: Supabase DB override" : "Source: default /og-nft-grid.png"}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/45">
              OG Card Claim Artwork URL
            </label>
            <input
              className="focus-ring mt-1 w-full rounded-lg border border-black/15 px-3 py-2.5 font-mono text-sm text-ink"
              placeholder="https://...supabase.co/storage/v1/object/public/... (empty = /og-card.png)"
              value={cardImage}
              onChange={(e) => setCardImage(e.target.value)}
            />
            <p className="mt-1 text-[0.7rem] text-black/40">
              {dbCardImage ? "Source: Supabase DB override" : "Source: default /og-card.png"}
            </p>
          </div>
        </div>
      </div>

      {/* Scores maintenance */}
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ink">Scores</h2>
        <p className="mt-1 text-sm text-black/55">
          Recalculate every profile&apos;s culture score from on-chain holdings across all verified wallets, then rebuild leaderboard ranks. Use after scoring changes or to fix stale scores.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="focus-ring rounded-full border border-[#0000FF]/30 bg-[#0000FF]/[0.06] px-6 py-2.5 text-sm font-semibold text-[#0000FF] transition hover:bg-[#0000FF]/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={refreshing}
            onClick={refreshAllScores}
            type="button"
          >
            {refreshing ? "Refreshing all scores…" : "Refresh all scores"}
          </button>
          {refreshMsg ? <span className="text-sm font-medium text-black/70">{refreshMsg}</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          className="focus-ring rounded-full bg-[#0000FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#141CB5] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saving}
          onClick={save}
          type="button"
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
        {message ? <span className="text-sm font-medium text-green-700">{message}</span> : null}
        {error ? <span className="text-sm font-medium text-red-600">{error}</span> : null}
      </div>
    </section>
  );
}
