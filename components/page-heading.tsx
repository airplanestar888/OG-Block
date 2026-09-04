import type { ReactNode } from "react";

// Two-tone page headline, identical to the hero treatment: the first part is
// solid ink, the rest is outlined. Same size and leading everywhere so every
// page headline reads as one system.
export function PageHeading({
  outline,
  className = "",
  children
}: {
  outline: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <h1
      className={`font-syne leading-[0.98] text-[#0A0B0D] ${className}`}
      style={{ fontSize: "clamp(1.9rem, 4vw, 3.1rem)" }}
    >
      {children}
      <span
        className="block text-transparent"
        style={{ WebkitTextStroke: "1.5px rgba(10,11,13,0.9)" }}
      >
        {outline}
      </span>
    </h1>
  );
}
