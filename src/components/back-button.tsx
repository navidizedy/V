"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * sessionStorage key that holds "how many pages deep into the app are we".
 * `Providers` bumps it on every client-side route change.
 */
export const NAV_DEPTH_KEY = "vanja:nav-depth";

export function readNavDepth(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.sessionStorage.getItem(NAV_DEPTH_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

type BackButtonProps = {
  /** Visible label. */
  label?: string;
  /**
   * Where to go when there is nothing to go back *to* — this happens constantly in
   * an installed PWA that was launched straight from the home screen (no tab
   * history at all), or when someone opens a deep link in a brand-new tab.
   */
  fallback?: string;
  className?: string;
};

/**
 * A back affordance for every page of the app.
 *
 * Visualy identical to the back link that already lived on the food-truck detail
 * page, but smart about the PWA case: `router.back()` only when we actually have
 * an in-app history entry, otherwise a normal push to a sensible parent route.
 */
export function BackButton({
  label = "بازگشت",
  fallback = "/",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  // Resolved lazily on click (not during render/effect) so there is no
  // hydration mismatch and no extra render pass on any page.
  const handleClick = useCallback(() => {
    if (readNavDepth() > 1 && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }, [fallback, router]);

  // Mobile only (below Tailwind's `md`, the same breakpoint the navbar's hamburger
  // menu uses). On desktop the browser already gives everyone a perfectly good back
  // button, so rendering one per page is just noise — and this wrapper collapses
  // entirely (display:none), so no empty gap is left behind where it used to sit.
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={
          className ||
          "inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors cursor-pointer"
        }
      >
        <ChevronLeft className="w-4 h-4" />
        {label}
      </button>
    </div>
  );
}
