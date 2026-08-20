"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const linkClass =
  "text-sm font-semibold text-white/85 transition hover:text-white";

// Idle particle wave (footer): small square pixels that drift right-to-left
// like flowing water, with a vertical sine bob. Canvas 2D, no Three.js. Faded
// into the solid blue footer via a left gradient so the text stays readable.
const PARTICLE_COLORS = ["#ffffff", "#7c5cff", "#4d7cff", "#f5c518", "#00c48c"];

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
        x: atRightEdge ? w + Math.random() * 40 : Math.random() * w,
        y: baseY,
        baseY,
        size,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        speed: 18 + Math.random() * 42, // px/sec leftward
        amp: 6 + Math.random() * 20, // vertical wave amplitude
        phase: Math.random() * Math.PI * 2,
        freq: 0.6 + Math.random() * 1.4,
        alpha: 0.4 + Math.random() * 0.5,
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

      const count = Math.max(40, Math.floor((w * h) / 2600));
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
        if (p.x < -8) {
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

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden" style={{ backgroundColor: "rgb(0, 0, 255)" }}>
      {/* animation layer (right side), faded into solid blue toward the left */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3">
        <FooterWave />
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
