"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/dashboard", label: "Dashboard" }
];

export function SiteNavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(10,11,13,0.08)] bg-white/90 backdrop-blur-md">
      <div
        className="page-container flex items-center justify-between"
        style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}
      >
        <Link href="/" className="focus-ring flex items-center gap-2.5">
          <Image
            src="/og-block-logo.png"
            alt="OG Block"
            width={38}
            height={38}
            className="rounded-[9px]"
          />
          <span
            className="text-[0.85rem] font-bold uppercase text-[#0A0B0D]"
            style={{ letterSpacing: "0.18em" }}
          >
            OG Block
          </span>
        </Link>

        <nav className="nav-links hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`focus-ring rounded-lg px-3 py-2 text-[0.82rem] font-semibold transition duration-150 hover:bg-[rgba(10,11,13,0.05)] hover:text-[#0A0B0D] ${
                pathname === href ? "text-[#0A0B0D]" : "text-[#0A0B0D]/50"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-1">
            <NavAuthAction isLoggedIn={isLoggedIn} compact />
          </div>
        </nav>

        <button
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg sm:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          type="button"
        >
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2L2 16" stroke="#0A0B0D" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="#0A0B0D" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[rgba(10,11,13,0.07)] bg-white sm:hidden">
          <nav className="page-container flex flex-col py-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-3.5 text-[0.95rem] font-semibold transition hover:bg-[rgba(10,11,13,0.04)] ${
                  pathname === href ? "text-[#0A0B0D]" : "text-[#0A0B0D]/60"
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 pb-2">
              <NavAuthAction isLoggedIn={isLoggedIn} />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function NavAuthAction({ isLoggedIn, compact = false }: { isLoggedIn: boolean; compact?: boolean }) {
  const sizeClass = compact
    ? "h-9 px-4 text-[0.8rem]"
    : "h-11 w-full justify-center text-[0.9rem]";

  if (isLoggedIn) {
    return (
      <button
        className={`focus-ring inline-flex items-center rounded-[10px] border border-black/15 bg-white font-semibold text-[#0A0B0D]/70 transition hover:border-black/25 hover:bg-black/[0.04] hover:text-[#0A0B0D] ${sizeClass}`}
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className={`focus-ring inline-flex items-center rounded-[10px] bg-[#0000FF] font-semibold text-white transition hover:bg-[#141CB5] ${sizeClass}`}
    >
      Log in with X
    </Link>
  );
}
