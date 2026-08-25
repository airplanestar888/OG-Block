"use client";

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

type ShareProfileButtonProps = {
  handle: string;
  score: number;
  rank: number | null;
};

export function ShareProfileButton({ handle, score, rank }: ShareProfileButtonProps) {
  const handleShare = () => {
    // Cache-bust so X always fetches a fresh card preview (X caches OG images
    // per-URL for days; a unique query makes each share a "new" URL).
    const url = `${window.location.origin}/u/${handle}?s=${Date.now().toString(36)}`;
    const text =
      `I'm OG on OG BLOCK — ${formatCompactNumber(score)} culture score${
        rank ? ` · Rank #${rank}` : ""
      }.\n\n` +
      `check your score → ${url}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#000000] px-5 text-[0.85rem] font-semibold text-white transition hover:opacity-90 active:scale-[0.98] sm:h-11 sm:text-[0.875rem]"
      onClick={handleShare}
      type="button"
    >
      <span aria-hidden="true">𝕏</span> Share to X
    </button>
  );
}
