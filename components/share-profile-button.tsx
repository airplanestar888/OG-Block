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
    const url = `${window.location.origin}/u/${handle}`;
    const text =
      `Check out @${handle} — ${formatCompactNumber(score)} culture score${
        rank ? ` · Rank #${rank}` : ""
      } on OG-Block 🚀\n\n` +
      `check your score → ${url}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#000000] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
      onClick={handleShare}
      type="button"
    >
      <span aria-hidden="true">𝕏</span> Share to X
    </button>
  );
}
