"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

type BackToTopProps = {
  /** Scroll threshold (in px) before the button appears. */
  threshold?: number;
  label?: string;
};

/**
 * Floating "back to top" control for long, infinitely-scrolled lists.
 * Rendered only on the client, after the user has actually scrolled.
 */
export function BackToTop({ threshold = 600, label = "بازگشت به بالا" }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label={label}
      title={label}
      className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gray-900/90 text-white text-xs font-bold shadow-xl shadow-gray-900/20 backdrop-blur-sm hover:bg-gray-900 transition-colors cursor-pointer animate-fade-in"
    >
      <ArrowUp className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
