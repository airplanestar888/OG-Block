import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "404 — Page not found · OG BLOCK",
  description: "This page doesn't exist. Head back to the leaderboard or the home page.",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-[60vh] items-center overflow-hidden bg-[#f7f8fb] px-5 py-16 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(0,0,255,0.13),transparent_28%),linear-gradient(90deg,rgba(0,0,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,255,0.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
      <section className="relative mx-auto w-full max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-baseblue">404 — Page not found</p>
        <div className="mt-2">
          <PageHeading outline="This gang doesn't exist.">Lost in the chain.</PageHeading>
        </div>
        <p className="mt-5 max-w-xl text-base leading-7 text-black/60">
          The page you’re looking for doesn’t exist — or the handle is stale. Check the URL or head back to where the
          culture lives.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" href="/">
            Back home
          </Link>
          <Link className="btn-secondary" href="/leaderboard">
            View leaderboard
          </Link>
          <Link className="btn-secondary" href="/how-it-works">
            How it works
          </Link>
        </div>
      </section>
    </main>
  );
}
