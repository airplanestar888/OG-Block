"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const linkClass =
  "text-sm font-semibold text-white/85 transition hover:text-white";

// Idle candle-bar animation (base.org CTA vibe) drawn on canvas 2D — no
// Three.js. Blue-on-blue bars that rise/fall on the right, faded into the
// solid footer via a left gradient so the text stays readable.
const BAR_COLORS = ["#ffffff", "#7c5cff", "#4d7cff", "#f5c518", "#00c48c"];

function FooterCandles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = canvasRef.current;
    const context = el?.getContext("2d");
    if (!el || !context) return;
    const canvas = el;
    const ctx = context;

    let dpr = 1;
    let w = 0;
    let h = 0;

    type Bar = { x: number; base: number; h: number; target: number; w: number; color: string; speed: number };
    let bars: Bar[] = [];

    function build() {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const gap = 10;
      const count = Math.max(8, Math.floor(w / gap));
      bars = Array.from({ length: count }, (_, i) => {
        const bw = 2 + Math.random() * 3;
        const bh = 8 + Math.random() * (h * 0.6);
        return {
          x: i * gap + gap * 0.5,
          base: h * 0.5 + (Math.random() - 0.5) * h * 0.3,
          h: bh,
          target: bh,
          w: bw,
          color: BAR_COLORS[Math.floor(Math.random() * BAR_COLORS.length)],
          speed: 0.01 + Math.random() * 0.03,
        };
      });
    }
    build();
    window.addEventListener("resize", build, { passive: true });

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (const b of bars) {
        // ease toward target height; pick a new target when close
        b.h += (b.target - b.h) * b.speed;
        if (Math.abs(b.target - b.h) < 2) {
          b.target = 8 + Math.random() * (h * 0.6);
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x - b.w / 2, b.base - b.h / 2, b.w, b.h);
      }
      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", build);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden" style={{ backgroundColor: "rgb(0, 0, 255)" }}>
      {/* animation layer (right side), faded into solid blue toward the left */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3">
        <FooterCandles />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgb(0,0,255) 22%, transparent 75%)" }}
        />
      </div>

      {/* content (left aligned) */}
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-4 px-5 py-10 text-left">
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <a className={linkClass} href="https://x.com/OGBLOCKHAIN" target="_blank" rel="noopener noreferrer">
            X
          </a>
          <a className={linkClass} href="https://github.com/airplanestar888/OG-Block" target="_blank" rel="noopener noreferrer">
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
