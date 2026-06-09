import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { SignInButton, SignOutButton } from "@/components/x-auth-buttons";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/78 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <Image className="shadow-sm" src="/og-block-logo.png" alt="" width={30} height={30} />
          <span>OG-Block</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="px-3 py-2 hover:bg-black/5" href="/leaderboard">
            Leaderboard
          </Link>
          <Link className="px-3 py-2 hover:bg-black/5" href="/dashboard">
            Dashboard
          </Link>
          {session ? <SignOutButton /> : <SignInButton />}
        </nav>
      </div>
    </header>
  );
}
