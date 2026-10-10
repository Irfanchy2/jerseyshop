"use client";

import * as React from "react";

/**
 * One shared IntersectionObserver for scroll-reveal animations (CSS-driven), instead of a
 * motion component per card. Respects prefers-reduced-motion via the global CSS rule.
 */
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (!observer && typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.revealed = "true";
            observer!.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
  }
  return observer;
}

export function useReveal<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (!el || !io) return;
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return ref;
}

export function Reveal({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-reveal="" className={className} style={{ ["--reveal-i" as string]: index }}>
      {children}
    </div>
  );
}
