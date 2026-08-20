"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

type ScoreRevealModalProps = {
  open: boolean;
  onClose: () => void;
  xHandle: string;
  xName: string | null;
  xAvatar: string | null;
  // Optional pre-fetched result. When supplied, the modal skips the refresh
  // fetch and reveals the card immediately (used for disconnect, where the
  // panel already has the recalculated score).
  prefetchedResult?: RevealResult | null;
};

type RevealResult = {
  score: number;
  rank: number | null;
  nftCount: number;
  isOg: boolean;
  tier: string | null;
};

const PROGRESS_STEPS = [
  "Wallet verified ✓",
  "Scanning NFTs across chains...",
  "Calculating culture score...",
  "Finalizing rank..."
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

export function ScoreRevealModal({ open, onClose, xHandle, xName, xAvatar, prefetchedResult }: ScoreRevealModalProps) {
  const [phase, setPhase] = useState<"progress" | "reveal" | "error">("progress");
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<RevealResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const runRefresh = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch("/api/score/refresh", { method: "POST", signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Score refresh failed");
      setProgressStep(PROGRESS_STEPS.length - 1);
      setResult({
        score: payload.score,
        rank: payload.rank ?? null,
        nftCount: payload.nftCount,
        isOg: Boolean(payload.isOg),
        tier: payload.tier ?? null
      });
      setPhase("reveal");
    } catch (err) {
      if (signal.aborted) return;
      setErrorMsg(err instanceof Error ? err.message : "Score refresh failed");
      setPhase("error");
    }
  }, []);

  // Kick off refresh + staged progress timer when modal opens.
  useEffect(() => {
    if (!open) return;

    setErrorMsg("");
    setAvatarFailed(false);

    // If the caller already has the result (e.g. disconnect flow), reveal it
    // immediately without a fetch or staged progress.
    if (prefetchedResult) {
      setResult(prefetchedResult);
      setProgressStep(PROGRESS_STEPS.length - 1);
      setPhase("reveal");
      return;
    }

    setPhase("progress");
    setProgressStep(0);
    setResult(null);

    const controller = new AbortController();
    const stepInterval = window.setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 800);

    void runRefresh(controller.signal);

    return () => {
      controller.abort();
      window.clearInterval(stepInterval);
    };
  }, [open, runRefresh, prefetchedResult]);

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

  // Capture the card as a PNG data URL (used by download).
  async function captureCard(): Promise<string | null> {
    if (!cardRef.current) return null;
    try {
      return await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
    } catch {
      return null;
    }
  }

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await captureCard();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = "og-block-card.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleShareX = () => {
    if (!result) return;
    const cleanHandle = (xHandle || "").replace(/^@/, "");
    const url = cleanHandle
      ? `${window.location.origin}/u/${cleanHandle}`
      : `${window.location.origin}/leaderboard`;
    const text =
      `I just scored ${formatCompactNumber(result.score)} pts${
        result.rank ? ` and ranked #${result.rank}` : ""
      } on OG BLOCK\n\n` +
      `check your score → ${url}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleDone = () => {
    onClose();
    window.location.reload();
  };

  if (!open) return null;

  const avatarSrc =
    xAvatar && !avatarFailed
      ? `/api/avatar-proxy?url=${encodeURIComponent(xAvatar)}`
      : null;
  const initial = (xHandle || "?").charAt(0).toUpperCase();
  const displayName = xName || xHandle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/65 p-3.5 backdrop-blur-md sm:p-4"
      onClick={phase === "progress" ? undefined : onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-2xl sm:rounded-[1.75rem]"
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
                Generating score
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
              <h2 className="text-lg font-semibold text-ink">Couldn&apos;t generate score</h2>
              <p className="text-sm text-black/55">{errorMsg}</p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                onClick={() => {
                  setPhase("progress");
                  setProgressStep(0);
                  const controller = new AbortController();
                  void runRefresh(controller.signal);
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
            {/* Personal card — capture target */}
            <div
              ref={cardRef}
              className="relative flex flex-col bg-[#0A0B0D] text-white"
              style={{ width: 400 }}
            >
              {/* Header */}
              <div className="relative overflow-hidden px-6 pb-6 pt-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(0,0,255,0.55),transparent_55%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,255,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.08)_1px,transparent_1px)] bg-[length:32px_32px]" />
                <div className="relative flex items-center gap-3.5">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={xHandle}
                      crossOrigin="anonymous"
                      onError={() => setAvatarFailed(true)}
                      className="size-16 shrink-0 rounded-full border-2 border-white/20 object-cover"
                    />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/20 bg-white/10 text-2xl font-bold">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-tight">
                      {displayName}
                    </p>
                    <p className="truncate text-sm text-white/55">@{xHandle}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
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
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                  OG BLOCK
                </p>
                <p className="text-xs text-white/35">
                  Base culture score
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 p-5 sm:p-6">
              <div className="flex gap-2">
                <button
                  className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#000000] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                  onClick={handleShareX}
                  type="button"
                >
                  <span aria-hidden="true">𝕏</span> Share to X
                </button>
                <button
                  className="focus-ring inline-flex flex-1 items-center justify-center rounded-full border border-black/15 px-4 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleDownload}
                  type="button"
                  disabled={downloading}
                >
                  {downloading ? "Saving…" : "Download PNG"}
                </button>
              </div>
              <button
                className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-baseblue px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
                onClick={handleDone}
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
