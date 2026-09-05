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
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setMounted(true);

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
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

  const animationClass = direction === "left" ? "reveal-left" : "reveal-right";
  const visibilityClass = mounted && !inView ? "opacity-0" : inView ? animationClass : "";

  return (
    <div
      ref={ref}
      className={`${visibilityClass} ${className}`}
      style={inView && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
