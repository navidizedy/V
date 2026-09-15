"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PlanCard } from "@/components/plan-card";
import { PLAN_CARDS, getPlanPrice } from "@/lib/plan-content";
import { useConfirm } from "@/components/confirm-dialog-provider";
import {
  Sparkles,
  Rocket,
  Store,
  UtensilsCrossed,
  Images,
  CalendarClock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BackButton } from "@/components/back-button";

function toFaDigits(n: number) {
  return Math.abs(n).toLocaleString("fa-IR");
}

function UsageBar({ used, limit, label, icon: Icon }: { used: number; limit: number; label: string; icon: any }) {
  const unlimited = limit >= 999;
  const pct = unlimited ? Math.min((used / 50) * 100, 100) : Math.min((used / limit) * 100, 100);
  const full = !unlimited && used >= limit;
  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 text-primary" />
          {label}
        </div>
        <span className={`text-xs font-bold ${full ? "text-red-500" : "text-gray-500"}`}>
          {used.toLocaleString("fa-IR")} / {unlimited ? "نامحدود" : limit.toLocaleString("fa-IR")}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-red-400" : "bg-gradient-to-r from-orange-500 to-pink-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => { setSub(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated" && session.user.role === "admin") { router.push("/dashboard/admin"); return; }
    // Subscriptions only exist for truck owner accounts — everyone else (users
    // and the founder) is bounced away just like an admin would be.
    if (status === "authenticated" && session.user.role !== "owner") { router.push("/businesses"); return; }
    if (session) load();
  }, [session, status, router]);

  const changePlan = async (plan: "free" | "pro") => {
    if (plan === "free") {
      const ok = await confirmDialog({
        title: "بازگشت به پلن رایگان",
        description: "با بازگشت به پلن رایگان، امکانات ویژه غیرفعال می‌شود. مطمئن هستید؟",
        confirmText: "بازگشت به رایگان",
        variant: "danger",
      });
      if (!ok) return;
    }
    setChanging(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setChanging(false);
    if (!res.ok) { setError(data.error || "خطا در تغییر پلن"); return; }
    setMessage(plan === "pro" ? "پلن حرفه‌ای با موفقیت فعال شد 🎉" : "به پلن رایگان بازگشتید");
    load();
    setTimeout(() => setMessage(""), 4000);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !sub) return null;

  const isPro = sub.plan === "pro";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-4xl mx-auto">
          <BackButton fallback="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">مدیریت اشتراک</h1>
            <p className="text-sm text-gray-500">پلن فعلی، میزان مصرف و ارتقای اشتراک</p>
          </div>

          {(message || error) && (
            <div className={`mb-6 p-3.5 rounded-xl text-sm font-medium ${message ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-600"}`}>
              {message ? <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</span> : error}
            </div>
          )}

          {/* Current plan card */}
          <div className={`rounded-3xl p-6 sm:p-8 mb-6 ${isPro ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white" : "bg-white border border-gray-100 shadow-sm"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isPro ? "bg-white/20" : "bg-orange-50"}`}>
                  {isPro ? <Sparkles className="w-7 h-7 text-white" /> : <Rocket className="w-7 h-7 text-primary" />}
                </div>
                <div>
                  <div className={`text-xs font-bold mb-0.5 ${isPro ? "text-white/80" : "text-gray-400"}`}>پلن فعلی شما</div>
                  <div className="text-2xl font-extrabold">{sub.planLabel}</div>
                </div>
              </div>
              {sub.planExpiresAt && (
                <div className={`flex items-center gap-2 text-sm ${isPro ? "text-white/90" : "text-gray-500"}`}>
                  <CalendarClock className="w-4 h-4" />
                  اعتبار تا {new Date(sub.planExpiresAt).toLocaleDateString("fa-IR")}
                </div>
              )}
            </div>

            {isPro && typeof sub.daysRemaining === "number" && (
              <div
                className={`mt-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                  sub.isExpiringSoon
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-white/15 text-white"
                }`}
              >
                {sub.isExpiringSoon ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CalendarClock className="w-5 h-5 shrink-0" />}
                {sub.daysRemaining > 0 ? (
                  <span>
                    {sub.isExpiringSoon
                      ? `⚠️ اشتراک شما تا ${toFaDigits(sub.daysRemaining)} روز دیگر تمام می‌شود. همین حالا تمدید کنید!`
                      : `${toFaDigits(sub.daysRemaining)} روز تا پایان اعتبار اشتراک شما باقی مانده است.`}
                  </span>
                ) : (
                  <span>⚠️ اشتراک شما امروز به پایان رسیده و به‌زودی به پلن رایگان بازمی‌گردید. برای جلوگیری از این اتفاق تمدید کنید.</span>
                )}
              </div>
            )}
          </div>

          {/* Usage */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="font-extrabold text-gray-900 mb-4">میزان مصرف</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UsageBar used={sub.usage.businesses} limit={sub.limits.businesses} label="فودتراک‌ها" icon={Store} />
              <UsageBar used={sub.usage.menuItems} limit={sub.limits.menuItems} label="آیتم‌های منو" icon={UtensilsCrossed} />
              <UsageBar used={sub.usage.photos} limit={sub.limits.photos} label="عکس‌های گالری" icon={Images} />
            </div>
          </div>

          {/* Plans — identical copy of the /pricing page plan cards (same design, price & options) */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="font-extrabold text-gray-900 text-lg">تغییر پلن</h2>
          </div>

          {isPro && !sub.canRenew && (
            <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-6">
              ⏳ شما اشتراک حرفه‌ای فعال دارید. امکان تمدید از {toFaDigits(sub.renewalWindowDays)} روز مانده به پایان اعتبار فعال می‌شود.
            </div>
          )}

          {isPro && sub.canRenew && (
            <div className={`mb-5 p-4 rounded-2xl border text-xs leading-6 font-bold ${sub.isExpiringSoon ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-100 text-green-700"}`}>
              {sub.isExpiringSoon ? "⚠️" : "✅"} شما اکنون در بازه تمدید اشتراک هستید — می‌توانید پلن حرفه‌ای را همین حالا تمدید کنید تا اعتبار آن ادامه پیدا کند.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {PLAN_CARDS.map((plan) => {
              const price = getPlanPrice(plan.monthlyPrice);
              const isCurrentPlan = sub.plan === plan.id;
              const topBadge = isCurrentPlan
                ? "پلن فعلی"
                : plan.id === "pro"
                ? "پیشنهادی ✦"
                : undefined;

              let footer: ReactNode = null;
              if (plan.id === "pro" && !isPro) {
                footer = (
                  <button
                    onClick={() => changePlan("pro")}
                    disabled={changing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold hover:from-orange-600 hover:to-pink-600 btn-glow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    ارتقا به حرفه‌ای
                  </button>
                );
              } else if (plan.id === "pro" && isPro && sub.canRenew) {
                footer = (
                  <button
                    onClick={() => changePlan("pro")}
                    disabled={changing}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold btn-glow disabled:opacity-50 flex items-center justify-center gap-2 ${
                      sub.isExpiringSoon
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-white text-primary hover:bg-white/90"
                    }`}
                  >
                    {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    تمدید اشتراک {typeof sub.daysRemaining === "number" && sub.daysRemaining > 0 ? `(${toFaDigits(sub.daysRemaining)} روز مانده)` : ""}
                  </button>
                );
              } else if (isCurrentPlan) {
                footer = (
                  <div className={`text-center text-xs font-bold ${plan.highlight ? "text-white/80" : "text-gray-400"}`}>
                    ✓ پلن فعال شما
                  </div>
                );
              }

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  price={price}
                  topBadge={topBadge}
                  current={isCurrentPlan}
                  footer={footer}
                />
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-6">
            💳 <strong>پرداخت آنلاین به‌زودی:</strong> درگاه بانکی در حال اتصال است. فعلاً فعال‌سازی پلن حرفه‌ای به‌صورت آزمایشی و بدون پرداخت انجام می‌شود.
          </div>
        </div>
      </main>
    </div>
  );
}
