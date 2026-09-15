"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline validation message shown under a form control. Renders nothing when there is no error. */
export function FieldError({ error, id, className }: { error?: string | null; id?: string; className?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className={cn("mt-1.5 flex items-start gap-1 text-xs text-red-600", className)}>
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
}

/** Small helper hint rendered under inputs (e.g. "فقط حروف فارسی"). */
export function FieldHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-[11px] text-gray-400 leading-5", className)}>{children}</p>;
}

/**
 * Standard input class used across the app, switching the border/ring to red when the field
 * has an error so the mistake is obvious at a glance.
 */
export function inputClass(hasError?: boolean | string | null, extra?: string) {
  return cn(
    "w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm transition-all focus:outline-none focus:ring-2",
    hasError
      ? "border-red-300 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500"
      : "border-gray-200 focus:ring-orange-500/20 focus:border-orange-500",
    extra
  );
}

/** Compact variant for dense dashboard forms. */
export function compactInputClass(hasError?: boolean | string | null, extra?: string) {
  return cn(
    "w-full px-3 py-2.5 rounded-xl border bg-gray-50 text-sm transition-all focus:outline-none focus:ring-2",
    hasError
      ? "border-red-300 bg-red-50/40 focus:ring-red-500/20 focus:border-red-500"
      : "border-gray-200 focus:ring-orange-500/20 focus:border-orange-500",
    extra
  );
}
