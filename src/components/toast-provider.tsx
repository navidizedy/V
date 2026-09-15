"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { icon: any; classes: string; iconClasses: string }> = {
  success: {
    icon: CheckCircle2,
    classes: "bg-white border-green-100",
    iconClasses: "text-green-500",
  },
  error: {
    icon: XCircle,
    classes: "bg-white border-red-100",
    iconClasses: "text-red-500",
  },
  info: {
    icon: Info,
    classes: "bg-white border-blue-100",
    iconClasses: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-white border-orange-100",
    iconClasses: "text-orange-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  // Only render the portal after the client has hydrated, so the server-rendered
  // HTML (which never includes this portal, since document.body isn't available
  // during SSR) matches the client's first render pass exactly. Setting this via
  // useEffect (instead of during render) avoids a hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message: string) => show(message, "success"),
      error: (message: string) => show(message, "error"),
      info: (message: string) => show(message, "info"),
      warning: (message: string) => show(message, "warning"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            dir="rtl"
            className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[100] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
          >
            {toasts.map((t) => {
              const style = VARIANT_STYLES[t.variant];
              const Icon = style.icon;
              return (
                <div
                  key={t.id}
                  className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg shadow-black/5 animate-toast-in ${style.classes}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClasses}`} />
                  <p className="flex-1 text-sm font-medium text-gray-800 leading-6">{t.message}</p>
                  <button
                    onClick={() => remove(t.id)}
                    className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
