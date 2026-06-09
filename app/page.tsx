import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <section className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-baseblue">Base NFT identity</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight text-ink md:text-6xl">
          Prove your culture score where people already look.
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-black/70">
          Connect X, verify a Base wallet by signature, calculate NFT status from the backend, and display rank on x.com profiles with a Chrome extension.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="focus-ring rounded-md bg-baseblue px-5 py-3 font-semibold text-white hover:bg-blue-700"
            href={session ? "/dashboard" : "/login"}
          >
            {session ? "Open dashboard" : "Start with X"}
          </Link>
          <Link
            className="focus-ring rounded-md border border-black/15 bg-white px-5 py-3 font-semibold hover:bg-black/5"
            href="/leaderboard"
          >
            View leaderboard
          </Link>
        </div>
      </section>

      <section className="grid gap-3">
        {[
          ["X identity", "OAuth login stores handle, display name, and avatar."],
          ["Verified wallet", "Base wallet ownership is proven by signed message."],
          ["NFT score", "Rules are editable in code and calculated only on the backend."],
          ["X extension", "Public rank and OG badge appear directly on profile pages."]
        ].map(([title, copy]) => (
          <div key={title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-black/65">{copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
