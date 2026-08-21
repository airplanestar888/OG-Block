"use client";

import { useEffect, useRef, useState } from "react";

type CodeResponse = {
  code: string;
  expiresAt: number;
  ttlMs: number;
  handle: string;
  instruction: string;
};

function useCountdown(expiresAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = Math.max(0, expiresAt - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { expired: ms <= 0, label: `${m}:${s.toString().padStart(2, "0")}` };
}

export function RegisterAgentButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CodeResponse | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(data?.expiresAt ?? null);
  const openedOnce = useRef(false);

  async function generate() {
    setLoading(true);
    setError("");
    setCopied(false);
    try {
      const res = await fetch("/api/agent/link-code", { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Could not generate code");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate code");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    if (!openedOnce.current) {
      openedOnce.current = true;
      void generate();
    }
  }

  async function copyInstruction() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.instruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="focus-ring rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#141CB5]"
      >
        Register agent
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="focus-ring absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-black/5 text-black/50 hover:bg-black/10"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-baseblue">Agent registration</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">One-time agent code</h2>
            <p className="mt-1 text-sm leading-6 text-black/60">
              Give this to your agent. It signs with its own wallet and registers into your agent slot — no login needed. Works once, expires in 15 minutes.
            </p>

            {loading ? (
              <p className="mt-6 text-sm text-black/50">Generating code…</p>
            ) : error ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-red-600">{error}</p>
                <button type="button" onClick={generate} className="focus-ring rounded-full bg-baseblue px-4 py-2 text-sm font-semibold text-white hover:bg-[#141CB5]">
                  Try again
                </button>
              </div>
            ) : data ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-black/10 bg-[#f7f8fb] px-4 py-3">
                  <span className="font-mono text-lg font-bold tracking-[0.15em] text-ink">{data.code}</span>
                  <span className={`text-xs font-semibold ${countdown?.expired ? "text-red-600" : "text-black/45"}`}>
                    {countdown?.expired ? "expired" : `expires in ${countdown?.label ?? "—"}`}
                  </span>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-black/45">Copy to your agent</span>
                    <button type="button" onClick={copyInstruction} className="focus-ring rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-black/70 hover:bg-black/5">
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <pre className="max-h-56 overflow-auto rounded-xl bg-ink p-3 text-[0.7rem] leading-5 text-white/90 whitespace-pre-wrap">{data.instruction}</pre>
                </div>

                {countdown?.expired ? (
                  <button type="button" onClick={generate} className="focus-ring w-full rounded-full bg-baseblue px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#141CB5]">
                    Generate a new code
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
