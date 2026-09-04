"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-triggered slide-in: children start invisible and slide in from the
// chosen side when the element enters the viewport (once). Falls back to
// always-visible for reduced-motion users.
export function SlideIn({
  direction,
  delay = 0,
  className = "",
  children
}: {
  direction: "left" | "right";
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${inView ? (direction === "left" ? "reveal-left" : "reveal-right") : "opacity-0"} ${className}`}
      style={inView && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
