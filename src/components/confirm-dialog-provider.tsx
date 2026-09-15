"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, Loader2 } from "lucide-react";

type ConfirmVariant = "danger" | "default";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type PendingState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const [busy, setBusy] = useState(false);
  // Determined via useEffect (not during render) so the server-rendered HTML
  // always matches the client's first render pass, avoiding hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      if (!pending) return;
      pending.resolve(result);
      setPending(null);
      setBusy(false);
    },
    [pending]
  );

  const value = useMemo<ConfirmContextValue>(() => confirm, [confirm]);

  const isDanger = pending?.variant !== "default";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {mounted &&
        pending &&
        createPortal(
          <div
            dir="rtl"
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-fade-in"
              onClick={() => !busy && close(false)}
            />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 animate-modal-in">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  isDanger ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                }`}
              >
                {isDanger ? <AlertTriangle className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1.5">
                {pending.title || "آیا مطمئن هستید؟"}
              </h3>
              {pending.description && (
                <p className="text-sm text-gray-500 leading-6 mb-6">{pending.description}</p>
              )}
              {!pending.description && <div className="mb-6" />}
              <div className="flex items-center gap-2.5">
                <button
                  disabled={busy}
                  onClick={() => close(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {pending.cancelText || "انصراف"}
                </button>
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    close(true);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-60 ${
                    isDanger ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                  }`}
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {pending.confirmText || "تایید"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  return ctx;
}
