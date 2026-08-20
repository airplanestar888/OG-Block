"use client";

import { useEffect, useRef } from "react";

const BITS = 73;

// base.org-style cursor trail: tiny vertical "candle" bars that spawn along the
// pointer path and fade out. Blue-dominant palette to keep our brand DNA.
const TRAIL_COLORS = ["#0000FF", "#4d7cff", "#7c5cff", "#00c48c", "#f5c518"];

// Each pixel gets a random depth factor (0.02 – 0.12)
// Higher = moves more with cursor (closer to viewer)
function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const pixels = Array.from({ length: BITS }, (_, i) => ({
  x: (i * 37.3) % 100,
  y: (i * 53.7) % 100,
  depth: 0.02 + seededRandom(i * 3) * 0.10,
  size: 4 + Math.floor(seededRandom(i * 7) * 8),
  opacity: 0.06 + seededRandom(i * 11) * 0.14,
  delay: (i % 20) * 80,
  color: seededRandom(i * 13) > 0.75 ? "#4d7cff" : "#0000FF",
}));

export function PixelField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const bitsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let cx = 0;
    let cy = 0;

    // ── Cursor trail (our square pixels that follow + fade) ────
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      max: number;
    };
    const particles: Particle[] = [];
    let lastSpawn = 0;
    let dpr = 1;

    function resize() {
      const el = fieldRef.current;
      if (!canvas || !el) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = el.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    function onMouseMove(e: MouseEvent) {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      if (lx < 0 || ly < 0 || lx > rect.width || ly > rect.height) return;

      // Normalize to -0.5 … +0.5 from center (parallax)
      mouseRef.current = {
        x: lx / rect.width - 0.5,
        y: ly / rect.height - 0.5,
      };
      el.style.setProperty("--cursor-x", `${lx}px`);
      el.style.setProperty("--cursor-y", `${ly}px`);

      // Spawn a small cluster of square pixels near the cursor, throttled.
      const now = performance.now();
      if (now - lastSpawn > 32) {
        lastSpawn = now;
        const count = 1 + Math.floor(Math.random() * 2);
        for (let k = 0; k < count; k++) {
          const size = 3 + Math.floor(Math.random() * 5);
          particles.push({
            x: lx + (Math.random() - 0.5) * 18,
            y: ly + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25 - 0.05,
            size,
            color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
            life: 0,
            max: 550 + Math.random() * 450,
          });
        }
        if (particles.length > 120) particles.splice(0, particles.length - 120);
      }
    }

    let prev = performance.now();
    function tick() {
      const now = performance.now();
      const dt = now - prev;
      prev = now;

      // Parallax lerp toward target
      cx += (mouseRef.current.x - cx) * 0.06;
      cy += (mouseRef.current.y - cy) * 0.06;
      bitsRef.current.forEach((bit, i) => {
        if (!bit) return;
        const p = pixels[i];
        const dx = cx * p.depth * 220;
        const dy = cy * p.depth * 220;
        bit.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      });

      // Draw + age the trail pixels
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          const t = p.life / p.max;
          if (t >= 1) {
            particles.splice(i, 1);
            continue;
          }
          // drift a little as it fades
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          // ease-out fade
          ctx.globalAlpha = (1 - t) * 0.7;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={fieldRef} className="pixel-field" aria-hidden="true">
      <canvas ref={canvasRef} className="pixel-field__trail" />
      {pixels.map((p, i) => (
        <span
          key={i}
          ref={(el) => { bitsRef.current[i] = el; }}
          className="pixel-field__bit"
          style={{
            left: `${p.x}%`,
            top:  `${p.y}%`,
            width:   `${p.size}px`,
            height:  `${p.size}px`,
            opacity: p.opacity,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            borderRadius: p.size > 9 ? "2px" : "1px",
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
