"use client";

import { useState } from "react";

type Props = {
  initialContract: string;
  initialChainId: number;
  dbContract: string | null;
  dbChain: string | null;
};

const CHAINS = [
  { id: 8453, label: "Base Mainnet (8453)" },
  { id: 84532, label: "Base Sepolia (84532)" }
];

export function AdminConfigForm({ initialContract, initialChainId, dbContract, dbChain }: Props) {
  const [contract, setContract] = useState(initialContract);
  const [chainId, setChainId] = useState(initialChainId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: contract.trim(), chainId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setContract(data.contractAddress || "");
      setChainId(Number(data.chainId));
      setMessage("Saved. The OG Card page now uses these values.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
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

        <div className="flex items-center gap-3 pt-1">
          <button
            className="focus-ring rounded-full bg-[#0000FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#141CB5] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving}
            onClick={save}
            type="button"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {message ? <span className="text-sm text-green-700">{message}</span> : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </div>
    </section>
  );
}
