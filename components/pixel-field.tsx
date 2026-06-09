"use client";

import { useEffect, useRef } from "react";

const pixelCount = 72;

export function PixelField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function updateCursor(event: MouseEvent) {
      const currentElement = ref.current;
      if (!currentElement) return;
      const rect = currentElement.getBoundingClientRect();
      currentElement.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
      currentElement.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
    }

    window.addEventListener("mousemove", updateCursor);
    return () => window.removeEventListener("mousemove", updateCursor);
  }, []);

  return (
    <div ref={ref} className="pixel-field" aria-hidden="true">
      {Array.from({ length: pixelCount }).map((_, index) => (
        <span
          key={index}
          className="pixel-field__bit"
          style={
            {
              "--i": index,
              "--x": `${(index * 37) % 100}%`,
              "--y": `${(index * 53) % 100}%`,
              "--delay": `${(index % 18) * 90}ms`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
