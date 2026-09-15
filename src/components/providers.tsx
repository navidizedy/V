"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/components/toast-provider";
import { PendingToastBridge } from "@/components/pending-toast-bridge";
import { ConfirmDialogProvider } from "@/components/confirm-dialog-provider";
import { NAV_DEPTH_KEY } from "@/components/back-button";

/**
 * How deep the user is into the app for the current browser session. Every
 * client-side route change bumps a counter in sessionStorage so <BackButton />
 * can tell "we really do have a page to go back to" apart from "this PWA was
 * launched fresh from the home screen" (where history.back() would silently do
 * nothing, or worse, close the app).
 */
let lastTrackedPath: string | null = null;

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || lastTrackedPath === pathname) return;
    lastTrackedPath = pathname;
    try {
      const raw = window.sessionStorage.getItem(NAV_DEPTH_KEY);
      const current = raw ? Number.parseInt(raw, 10) : 0;
      const next = Number.isFinite(current) ? current + 1 : 1;
      window.sessionStorage.setItem(NAV_DEPTH_KEY, String(next));
    } catch {
      // sessionStorage can be unavailable (private mode) — back buttons then
      // simply fall back to their parent route, which is still fine.
    }
  }, [pathname]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register the PWA service worker only once the page is idle.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(register, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(register, 3000);
    return () => clearTimeout(id);
  }, []);

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ToastProvider>
        <PendingToastBridge />
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
