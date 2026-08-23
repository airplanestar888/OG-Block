"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

// Particle wave for the slim footer bar: small white pixels drifting
// right-to-left with a vertical sine bob — Base DNA on the blue glass bar.
const PARTICLE_COLORS = ["#ffffff"];

function FooterWave() {
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

    type Particle = {
      x: number;
      y: number;
      baseY: number;
      size: number;
      color: string;
      speed: number;
      amp: number;
      phase: number;
      freq: number;
      alpha: number;
    };
    let particles: Particle[] = [];

    function makeParticle(atRightEdge: boolean): Particle {
      const size = 2 + Math.floor(Math.random() * 4);
      const baseY = Math.random() * h;
      return {
        x: atRightEdge ? w + Math.random() * 20 : Math.random() * w,
        y: baseY,
        baseY,
        size,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        speed: 12 + Math.random() * 26, // px/sec leftward
        amp: 2 + Math.random() * 6, // gentle bob for a slim bar
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 1.4,
        alpha: 0.15 + Math.random() * 0.35
      };
    }

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

      const count = Math.max(24, Math.floor((w * h) / 900));
      particles = Array.from({ length: count }, () => makeParticle(false));
    }
    build();
    window.addEventListener("resize", build, { passive: true });

    let prev = performance.now();
    let t = 0;
    function tick() {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      t += dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (const p of particles) {
        // flow leftward
        p.x -= p.speed * dt;
        // wave bob
        p.y = p.baseY + Math.sin(t * p.freq + p.phase) * p.amp;
        // recycle off the left edge back to the right
        if (p.x < -6) {
          Object.assign(p, makeParticle(true));
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
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

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

// Slim glassy bar mirroring the site header: same border, blur treatment, and
// vertical padding (0.875rem) so the two bars feel like one chrome system —
// but in Base blue.
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-[#141CB5]/40 bg-[#0000FF]/90 backdrop-blur-md">
      <FooterWave />
      <div
        className="page-container relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2"
        style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}
      >
        <div className="flex items-center gap-2.5">
          <Image
            src="/og-block-logo.svg"
            alt=""
            width={22}
            height={20}
            className="h-5 w-[22px] rounded-[6px] object-cover"
          />
          <span className="text-[0.82rem] font-black tracking-[-0.03em] text-white">
            OG BLOCK
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a
            className="text-[0.78rem] font-semibold text-white/70 transition hover:text-white"
            href="https://x.com/OGBLOCKHAIN"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
          >
            X
          </a>
          <a
            className="text-[0.78rem] font-semibold text-white/70 transition hover:text-white"
            href="https://github.com/airplanestar888/OG-Block"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            GitHub
          </a>
          <Link
            className="text-[0.78rem] font-semibold text-white/70 transition hover:text-white"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="text-[0.78rem] font-semibold text-white/70 transition hover:text-white"
            href="/terms"
          >
            Terms
          </Link>
        </nav>

        <p className="text-[0.7rem] text-white/50">© 2026 OG BLOCK</p>
      </div>
    </footer>
  );
}
