"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/leaderboard",  label: "Leaderboard"  },
  { href: "/dashboard",    label: "Dashboard"    },
];

export function SiteNavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(10,11,13,0.08)] bg-white/90 backdrop-blur-md">
      <div
        className="page-container flex items-center justify-between"
        style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}
      >
        {/* ── Logo ── */}
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

        {/* ── Desktop nav (≥ sm) ── */}
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
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="focus-ring inline-flex h-9 items-center rounded-[10px] bg-[#0000FF] px-4 text-[0.8rem] font-semibold text-white transition hover:bg-[#141CB5]"
            >
              {isLoggedIn ? "Dashboard" : "Log in with X"}
            </Link>
          </div>
        </nav>

        {/* ── Mobile hamburger (< sm) ── */}
        <button
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg sm:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            /* X icon */
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 2l14 14M16 2L2 16" stroke="#0A0B0D" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            /* Hamburger */
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <path d="M0 1h18M0 7h18M0 13h18" stroke="#0A0B0D" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile slide-down menu ── */}
      {open && (
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
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="focus-ring inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-[#0000FF] text-[0.9rem] font-semibold text-white transition hover:bg-[#141CB5]"
              >
                {isLoggedIn ? "Open dashboard" : "Log in with X"}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
