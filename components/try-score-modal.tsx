"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { shortAddress } from "@/lib/address";

export type TryScoreResult = {
  address: string;
  score: number;
  rank: number | null;
  previewRank: boolean;
  nftCount: number;
  isOg: boolean;
  tier: string | null;
  contractBreakdown?: {
    total: number;
    spam: number;
    verified: number;
    unverified: number;
  } | null;
};

type TryScoreModalProps = {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  // Executes the anonymous scan; run inside the modal so the card animates
  // through the same staged progress as the dashboard reveal.
  runScan: (signal: AbortSignal) => Promise<TryScoreResult>;
};

const PROGRESS_STEPS = [
  "Scanning NFTs on Base...",
  "Checking contract reputation...",
  "Calculating culture score...",
  "Finalizing preview..."
];

function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString();
}

export function TryScoreModal({ open, onClose, isLoggedIn, runScan }: TryScoreModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"progress" | "reveal" | "error">("progress");
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<TryScoreResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const startScan = useCallback(
    (signal: AbortSignal) => {
      setErrorMsg("");
      setPhase("progress");
      setProgressStep(0);
      setResult(null);

      const stepInterval = window.setInterval(() => {
        setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
      }, 800);

      runScan(signal)
        .then((payload) => {
          if (signal.aborted) return;
          setResult(payload);
          setProgressStep(PROGRESS_STEPS.length - 1);
          setPhase("reveal");
        })
        .catch((err: unknown) => {
          if (signal.aborted) return;
          setErrorMsg(err instanceof Error ? err.message : "Could not score this wallet");
          setPhase("error");
        })
        .finally(() => window.clearInterval(stepInterval));
    },
    [runScan]
  );

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    startScan(controller.signal);
    return () => controller.abort();
  }, [open, startScan]);

  // Body scroll lock + escape to close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "progress") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, phase, onClose]);

  if (!open) return null;

  const displayName = result ? shortAddress(result.address) : null;

  const unlockRank = () => {
    if (isLoggedIn) {
      router.push("/leaderboard");
    } else {
      void signIn("twitter", { callbackUrl: "/leaderboard" });
    }
  };

  const claimBadges = () => {
    if (isLoggedIn) {
      router.push("/og-card");
    } else {
      void signIn("twitter", { callbackUrl: "/og-card" });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/65 p-3.5 backdrop-blur-md sm:p-4"
      onClick={phase === "progress" ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="focus-ring absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70 active:scale-95 sm:size-9"
          onClick={phase === "progress" ? undefined : onClose}
          aria-label="Close"
          type="button"
          disabled={phase === "progress"}
        >
          ✕
        </button>

        {phase === "progress" ? (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <div className="relative grid size-16 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-baseblue/25" />
              <span className="relative size-16 rounded-full border-4 border-baseblue/20 border-t-baseblue animate-spin" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-baseblue">
                Scanning wallet
              </p>
              <p className="min-h-[1.5rem] text-sm text-black/65">
                {PROGRESS_STEPS[progressStep]}
              </p>
            </div>
            <div className="flex w-full max-w-[220px] gap-1">
              {PROGRESS_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= progressStep ? "bg-baseblue" : "bg-black/10"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : phase === "error" ? (
          <div className="space-y-4 px-6 py-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/10 text-2xl text-red-600">
              ✕
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink">Couldn&apos;t score this wallet</h2>
              <p className="text-sm text-black/55">{errorMsg}</p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                onClick={() => {
                  const controller = new AbortController();
                  startScan(controller.signal);
                }}
                type="button"
              >
                Retry
              </button>
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-black/15 px-5 py-2.5 text-sm font-semibold text-black/65 transition hover:bg-black/5 active:scale-[0.98]"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Preview card — mirrors the dashboard score reveal */}
            <div className="relative flex w-full flex-col bg-[#0A0B0D] text-white">
              <div className="relative overflow-hidden px-6 pb-6 pt-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(0,0,255,0.55),transparent_55%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,255,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.08)_1px,transparent_1px)] bg-[length:32px_32px]" />
                <div className="relative flex items-center gap-3.5">
                  <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/20 bg-white/10 text-2xl font-bold text-white/70">
                    ?
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-tight">
                      {displayName}
                    </p>
                    <p className="truncate text-sm text-white/55">
                      Wallet preview · not signed in
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative space-y-5 px-6 pb-7 pt-2">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/40">
                      Culture score
                    </p>
                    <p className="mt-1 text-5xl font-bold leading-none tracking-tight">
                      {formatCompactNumber(result?.score ?? 0)}
                    </p>
                  </div>
                  {result?.rank ? (
                    <span className="rounded-full bg-baseblue px-3 py-1.5 text-sm font-bold">
                      Rank #{result.rank}
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-white/45">
                  Would-be rank — sign in with X to lock it in on the leaderboard.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/40">
                      NFTs
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {(result?.nftCount ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-white/40">
                      Status
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {result?.tier ? result.tier : result?.isOg ? "OG" : "Member"}
                    </p>
                  </div>
                </div>

                {result?.contractBreakdown ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/40">
                        Verified
                      </p>
                      <p className="mt-1 text-base font-semibold text-emerald-300">
                        {result.contractBreakdown.verified}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/40">
                        Unverified
                      </p>
                      <p className="mt-1 text-base font-semibold text-amber-300">
                        {result.contractBreakdown.unverified}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
                      <p className="text-[0.58rem] font-bold uppercase tracking-[0.1em] text-white/40">
                        Spam
                      </p>
                      <p className="mt-1 text-base font-semibold text-rose-300">
                        {result.contractBreakdown.spam}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                  OG BLOCK
                </p>
                <p className="text-xs text-white/35">
                  Base culture score
                </p>
              </div>
            </div>

            {/* Actions — sign in paths */}
            <div className="space-y-2 p-5 sm:p-6">
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-baseblue px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                onClick={unlockRank}
                type="button"
              >
                {isLoggedIn ? "View your leaderboard rank" : "Unlock your rank — sign in with X"}
              </button>
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[#000000] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                onClick={claimBadges}
                type="button"
              >
                {isLoggedIn ? "Claim your badges" : "Claim your badges — sign in with X"}
              </button>
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-black/65 transition hover:bg-black/5 active:scale-[0.98]"
                onClick={onClose}
                type="button"
              >
                Try another wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
