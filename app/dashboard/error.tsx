"use client";

export default function DashboardError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/10 text-2xl text-red-600">
          ⚠
        </div>
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="text-sm leading-6 text-black/55">
          We couldn&apos;t load your dashboard. This is usually temporary — try refreshing the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring inline-flex items-center justify-center rounded-full bg-baseblue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
