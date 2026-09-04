"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";

// Hologram treatment for the hero NFT grid: pointer-tracked 3D tilt, an
// iridescent sheen, scanlines, and a projector beam rising from the bottom
// edge (the direction of the On Chain strip). The water feature is a
// cursor-sized disc of the picture that fades to 80% and ripples via an
// SVG turbulence filter. The disc trails the pointer with a spring lag and
// keeps swaying gently when the mouse rests, so moving the mouse feels like
// stirring water under a hologram; faster strokes raise the displacement.
// Every light layer stays clipped inside the image frame. Cosmetic only;
// disabled for reduced-motion users.
export function HoloImage({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const rafRef = useRef(0);
  const loopOn = useRef(false);
  const hovering = useRef(false);
  const target = useRef({ x: 50, y: 50 });
  const cur = useRef({ x: 50, y: 50 });
  const curHole = useRef(0); // lerped base-mask hole radius (px)
  const vel = useRef(0);
  const [holo, setHolo] = useState({ rx: 0, ry: 0, px: 50, py: 50, active: false });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    target.current = {
      x: Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100),
      y: Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 0), 100)
    };
    setHolo((h) => ({
      rx: (0.5 - target.current.y / 100) * 9,
      ry: (target.current.x / 100 - 0.5) * 11,
      px: target.current.x,
      py: target.current.y,
      active: true
    }));
    if (!hovering.current) {
      hovering.current = true;
      if (!loopOn.current) {
        loopOn.current = true;
        rafRef.current = requestAnimationFrame(tick);
      }
    }
  }

  function onLeave() {
    hovering.current = false;
    vel.current = 0;
    setHolo((h) => ({ ...h, rx: 0, ry: 0, active: false }));
  }

  function tick() {
    const t = performance.now() / 1000;

    // Spring lag: the disc chases the pointer, so hand movements make the
    // water trail behind instead of snapping along.
    const dx = target.current.x - cur.current.x;
    const dy = target.current.y - cur.current.y;
    vel.current = vel.current * 0.85 + Math.hypot(dx, dy) * 0.15;
    cur.current.x += dx * 0.065;
    cur.current.y += dy * 0.065;

    // Gentle idle sway so the ripple never sits perfectly still.
    const sx = cur.current.x + Math.sin(t * 1.4) * 1.6;
    const sy = cur.current.y + Math.cos(t * 1.1) * 1.6;

    // Hole in the base image opens/closes smoothly and rides the disc.
    const holeTarget = hovering.current ? 90 : 0;
    curHole.current += (holeTarget - curHole.current) * 0.14;

    if (baseRef.current) {
      const m = `radial-gradient(circle ${curHole.current.toFixed(1)}px at ${sx.toFixed(2)}% ${sy.toFixed(2)}%, transparent 30%, black 100%)`;
      baseRef.current.style.maskImage = m;
      baseRef.current.style.webkitMaskImage = m;
    }
    if (discRef.current) {
      const r = (curHole.current / 90) * 110;
      discRef.current.style.clipPath = `circle(${r.toFixed(1)}px at ${sx.toFixed(2)}% ${sy.toFixed(2)}%)`;
      discRef.current.style.webkitClipPath = `circle(${r.toFixed(1)}px at ${sx.toFixed(2)}% ${sy.toFixed(2)}%)`;
      const mm = `radial-gradient(circle ${curHole.current.toFixed(1)}px at ${sx.toFixed(2)}% ${sy.toFixed(2)}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)`;
      discRef.current.style.maskImage = mm;
      discRef.current.style.webkitMaskImage = mm;
    }
    // Stirring strength: quick strokes churn the water harder, then settle.
    if (dispRef.current) {
      dispRef.current.setAttribute("scale", (12 + Math.min(vel.current * 1.4, 9)).toFixed(1));
    }

    if (!hovering.current && curHole.current < 0.5 && Math.hypot(dx, dy) < 0.05) {
      loopOn.current = false;
      if (baseRef.current) {
        baseRef.current.style.maskImage = "";
        baseRef.current.style.webkitMaskImage = "";
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative [perspective:1200px]"
    >
      {/* Animated water-ripple filter; displacement scale is steered live
          from the tick loop via dispRef */}
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id="holo-ripple" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" numOctaves="2" result="waves">
            <animate
              attributeName="baseFrequency"
              dur="7s"
              values="0.010 0.018;0.013 0.024;0.010 0.018"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="waves" scale="12" />
        </filter>
      </svg>

      <div
        className="relative transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${holo.rx}deg) rotateY(${holo.ry}deg)` }}
      >
        <div
          ref={baseRef}
          className="nft-image-wrap overflow-hidden transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: holo.active
              ? `translate(${(holo.px - 50) * 0.08}px, ${(holo.py - 50) * 0.08}px)`
              : "translate(0, 0)"
          }}
        >
          {children}

          {/* hologram scanlines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.55) 0 1px, transparent 1px 4px)"
            }}
          />

          {/* iridescent sheen following the cursor — kept faint so the
              ripple disc stays the star */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: holo.active ? 0.27 : 0,
              mixBlendMode: "screen",
              background: `radial-gradient(120% 90% at ${holo.px}% ${holo.py}%, rgba(140,225,255,0.15) 0%, rgba(0,0,255,0.09) 42%, transparent 72%)`
            }}
          />

          {/* projector beam rising from the bottom (On Chain strip side) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
            style={{
              mixBlendMode: "screen",
              background:
                "linear-gradient(to top, rgba(140,225,255,0.30) 0%, rgba(0,0,255,0.10) 45%, transparent 100%)"
            }}
          />

          {/* glowing baseline at the bottom edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-cyan-200/80 shadow-[0_0_14px_2px_rgba(140,225,255,0.75)]"
          />

          {/* The watery projection disc: the same picture, faded and
              displaced by the ripple filter, chasing the pointer with a
              spring lag and swaying gently while idle */}
          <div
            ref={discRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
            style={{ filter: "url(#holo-ripple)" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
