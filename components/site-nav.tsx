import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { SignInButton, SignOutButton } from "@/components/x-auth-buttons";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(10,11,13,0.08)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="focus-ring flex items-center gap-2.5"
        >
          <Image
            src="/og-block-logo.png"
            alt="OG Block"
            width={38}
            height={38}
            className="rounded-[9px]"
          />
          <span className="text-[0.85rem] font-bold uppercase tracking-[0.18em] text-[#0A0B0D]">
            OG Block
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {[
            { href: "/how-it-works", label: "How it works" },
            { href: "/leaderboard",  label: "Leaderboard"  },
            { href: "/dashboard",    label: "Dashboard"    },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring rounded-lg px-3 py-2 text-[0.82rem] font-semibold text-[#0A0B0D]/55 transition duration-150 hover:bg-[rgba(10,11,13,0.05)] hover:text-[#0A0B0D]"
            >
              {label}
            </Link>
          ))}
          <div className="ml-1">
            {session ? <SignOutButton /> : <SignInButton />}
          </div>
        </nav>
      </div>
    </header>
  );
}
