"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";

// Hologram treatment for the hero NFT grid: pointer-tracked 3D tilt, a
// counter-parallax on the image itself, an iridescent sheen that follows the
// cursor, scanlines, and a projector beam rising from the bottom edge (the
// direction of the On Chain strip). On hover the image itself fades to 80%
// and wobbles through an SVG turbulence filter, so it reads as a projection
// breaking up under a hand. Every light layer stays clipped inside the image
// frame — nothing bleeds onto neighbouring panels. Cosmetic only; disabled
// for reduced-motion users.
export function HoloImage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [holo, setHolo] = useState({ rx: 0, ry: 0, px: 50, py: 50, active: false });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);
    setHolo({
      rx: (0.5 - y) * 9,
      ry: (x - 0.5) * 11,
      px: x * 100,
      py: y * 100,
      active: true
    });
  }

  function onLeave() {
    setHolo((h) => ({ ...h, rx: 0, ry: 0, active: false }));
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative [perspective:1200px]"
    >
      {/* Animated water-ripple filter, referenced only while hovering */}
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
          <feDisplacementMap in="SourceGraphic" in2="waves" scale="9" />
        </filter>
      </svg>

      <div
        className="relative transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${holo.rx}deg) rotateY(${holo.ry}deg)` }}
      >
        <div
          className="nft-image-wrap overflow-hidden transition-transform duration-300 ease-out will-change-transform"
          style={{
            transform: holo.active
              ? `translate(${(holo.px - 50) * 0.08}px, ${(holo.py - 50) * 0.08}px)`
              : "translate(0, 0)",
            // While hovering, punch a soft cursor-sized hole in the base
            // image so the rippling projection below shows through only
            // there — the rest of the picture stays untouched.
            maskImage: holo.active
              ? `radial-gradient(circle 90px at ${holo.px}% ${holo.py}%, transparent 30%, black 100%)`
              : undefined,
            WebkitMaskImage: holo.active
              ? `radial-gradient(circle 90px at ${holo.px}% ${holo.py}%, transparent 30%, black 100%)`
              : undefined
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
              opacity: holo.active ? 0.38 : 0,
              mixBlendMode: "screen",
              background: `radial-gradient(120% 90% at ${holo.px}% ${holo.py}%, rgba(140,225,255,0.22) 0%, rgba(0,0,255,0.12) 42%, transparent 72%)`
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

          {/* The rippling projection itself: a cursor-sized disc of the same
              picture, faded to 80% and displaced by the water filter, with a
              soft masked edge. clip-path bounds the filter's work region. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: holo.active ? 1 : 0,
              filter: "url(#holo-ripple)",
              clipPath: `circle(110px at ${holo.px}% ${holo.py}%)`,
              WebkitClipPath: `circle(110px at ${holo.px}% ${holo.py}%)`,
              maskImage: `radial-gradient(circle 90px at ${holo.px}% ${holo.py}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)`,
              WebkitMaskImage: `radial-gradient(circle 90px at ${holo.px}% ${holo.py}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)`
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
