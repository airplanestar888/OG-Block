import Link from "next/link";

const linkClass =
  "text-sm font-semibold text-white/85 transition hover:text-white";

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: "rgb(0, 0, 255)" }}>
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
        <p className="text-sm font-bold text-white">© 2026 OG BLOCK</p>
      </div>
    </footer>
  );
}
