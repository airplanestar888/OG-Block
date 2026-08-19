import Link from "next/link";

const linkClass =
  "text-sm font-semibold text-[#0A0B0D]/60 transition hover:text-[#0000FF]";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <a
            className={linkClass}
            href="https://x.com/OGBLOCKHAIN"
            target="_blank"
            rel="noopener noreferrer"
          >
            X
          </a>
          <a
            className={linkClass}
            href="https://github.com/airplanestar888/OG-Block"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link className={linkClass} href="/privacy">
            Privacy
          </Link>
          <Link className={linkClass} href="/terms">
            Terms
          </Link>
        </nav>
        <p className="text-xs text-[#0A0B0D]/45">© 2026 OG-Block</p>
      </div>
    </footer>
  );
}
