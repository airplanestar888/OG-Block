import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignInButton, SignOutButton } from "@/components/x-auth-buttons";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="border-b border-black/10 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-ink">
          Base Culture Score
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="rounded-md px-3 py-2 hover:bg-black/5" href="/leaderboard">
            Leaderboard
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-black/5" href="/dashboard">
            Dashboard
          </Link>
          {session ? <SignOutButton /> : <SignInButton />}
        </nav>
      </div>
    </header>
  );
}
