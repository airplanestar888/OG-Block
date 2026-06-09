"use client";

import { useEffect, useRef } from "react";

const BITS = 56;

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
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let cx = 0;
    let cy = 0;

    function onMouseMove(e: MouseEvent) {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Normalize to -0.5 … +0.5 from center
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top)  / rect.height - 0.5,
      };
      // Update CSS var for grid mask
      el.style.setProperty("--cursor-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--cursor-y", `${e.clientY - rect.top}px`);
    }

    function tick() {
      // Smooth lerp toward target
      cx += (mouseRef.current.x - cx) * 0.06;
      cy += (mouseRef.current.y - cy) * 0.06;

      bitsRef.current.forEach((bit, i) => {
        if (!bit) return;
        const p = pixels[i];
        // Parallax offset — deeper pixels move less
        const dx = cx * p.depth * 220;
        const dy = cy * p.depth * 220;
        bit.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={fieldRef} className="pixel-field" aria-hidden="true">
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
