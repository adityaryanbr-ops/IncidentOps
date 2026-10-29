"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.removeAttribute("data-reveal");
        observer.disconnect();
      }
    }, { threshold: 0.08 });
    const reveal = () => { element.removeAttribute("data-reveal"); observer.disconnect(); };
    // Only prepare below-fold sections, so hydration never hides visible content.
    if (element.getBoundingClientRect().top > window.innerHeight) element.setAttribute("data-reveal", "pending");
    observer.observe(element);
    preference.addEventListener("change", reveal);
    return () => { observer.disconnect(); preference.removeEventListener("change", reveal); element.removeAttribute("data-reveal"); };
  }, []);
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
}
