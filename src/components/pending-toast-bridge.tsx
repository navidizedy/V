"use client";

import { useEffect } from "react";
import { useToast } from "@/components/toast-provider";

const STORAGE_KEY = "pendingToast";

// Some flows (like deleting your own account) end with next-auth's signOut(),
// which does a full page redirect/reload — any in-memory toast shown right
// before that call would be wiped out instantly along with the rest of the
// React tree. To still show a "your account was deleted" style toast after
// that reload, the triggering code stashes a small message in sessionStorage
// via `queuePendingToast()`, and this bridge (mounted once at the root, inside
// ToastProvider) picks it up on the next page load and displays it.
export function queuePendingToast(message: string, variant: "success" | "error" | "info" | "warning" = "success") {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ message, variant }));
  } catch {
    // sessionStorage may be unavailable (private mode, etc.) — safe to ignore.
  }
}

export function PendingToastBridge() {
  const toast = useToast();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      const { message, variant } = JSON.parse(raw) as { message: string; variant: "success" | "error" | "info" | "warning" };
      if (message) toast.show(message, variant || "success");
    } catch {
      // Ignore malformed/unavailable storage.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
