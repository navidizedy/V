import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import type { PlanCardContent } from "@/lib/plan-content";

interface PlanCardProps {
  plan: PlanCardContent;
  price: { display: string; period: string; note: string | null };
  topBadge?: ReactNode;
  footer?: ReactNode;
  /** Adds an active ring around a non-highlighted plan (used for "current plan" state in the dashboard). */
  current?: boolean;
}

// Shared card UI so the plans shown on the public /pricing page and inside the
// business owner dashboard (/dashboard/subscription) are always an exact copy of one another.
export function PlanCard({ plan, price, topBadge, footer, current }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-3xl p-8 flex flex-col transition-all ${
        plan.highlight
          ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-2xl shadow-orange-500/20"
          : current
          ? "bg-white border-2 border-primary shadow-md"
          : "bg-white border border-gray-100 shadow-sm"
      }`}
    >
      {topBadge && (
        <span className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 rounded-full bg-white text-primary text-xs font-bold shadow-sm whitespace-nowrap">
          {topBadge}
        </span>
      )}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${plan.highlight ? "bg-white/20" : "bg-orange-50"}`}>
        <plan.icon className={`w-6 h-6 ${plan.highlight ? "text-white" : "text-primary"}`} />
      </div>
      <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
      <p className={`text-sm mb-5 ${plan.highlight ? "text-white/80" : "text-gray-500"}`}>{plan.description}</p>
      <div className="mb-1 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-3xl font-extrabold">{price.display}</span>
        <span className={`text-sm ${plan.highlight ? "text-white/80" : "text-gray-500"}`}>{price.period}</span>
      </div>
      <div className="h-5 mb-5">
        {price.note && (
          <span className={`text-xs font-medium ${plan.highlight ? "text-white/90" : "text-green-600"}`}>{price.note}</span>
        )}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-center gap-2.5 text-sm">
            {f.ok ? (
              <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-white" : "text-green-500"}`} />
            ) : (
              <X className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-white/40" : "text-gray-300"}`} />
            )}
            <span className={f.ok ? "" : plan.highlight ? "text-white/50" : "text-gray-400"}>{f.label}</span>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
