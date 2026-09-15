"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { VanjaPlusBadge, TruckLogoOverlay, CategoryPills } from "@/components/business-card";
import { InstagramIcon } from "@/components/social-icons";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { useToast } from "@/components/toast-provider";
import {
  Store,
  Plus,
  Clock,
  Star,
  Eye,
  Pencil,
  Trash2,
  ExternalLink,
  Power,
  BarChart3,
  Heart,
  Lock,
  Headset,
  MessageCircle,
  Phone,
  Sparkles,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { BackButton } from "@/components/back-button";

const toFaDigits = (n: number) => Math.abs(n).toLocaleString("fa-IR");

export default function OwnerDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [advanced, setAdvanced] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (status === "authenticated" && session.user.role === "admin") {
      router.push("/dashboard/admin");
      return;
    }
    if (status === "authenticated" && session.user.role !== "owner") {
      router.push("/businesses");
      return;
    }
    if (session) {
      fetch("/api/owner?type=businesses")
        .then((r) => r.json())
        .then((data) => { setBusinesses(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
      fetch("/api/subscription")
        .then((r) => r.json())
        .then((data) => setSub(data))
        .catch(() => {});
      fetch("/api/owner?type=advanced-stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setAdvanced(data))
        .catch(() => {});
    }
  }, [session, status, router]);

  const deleteBusiness = async (slug: string, name?: string) => {
    const ok = await confirmDialog({
      title: "حذف فودتراک",
      description: `فودتراک${name ? ` «${name}»` : ""} برای همیشه حذف شود؟ این عمل قابل بازگشت نیست.`,
      confirmText: "حذف فودتراک",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/businesses/${slug}`, { method: "DELETE" });
    if (res.ok) {
      setBusinesses((prev) => prev.filter((b) => b.slug !== slug));
      toast.success("فودتراک با موفقیت حذف شد");
    } else {
      toast.error("خطا در حذف فودتراک");
    }
  };

  const toggleOpen = async (slug: string, current: boolean) => {
    const res = await fetch(`/api/businesses/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !current }),
    });
    if (res.ok) {
      setBusinesses((prev) => prev.map((b) => b.slug === slug ? { ...b, isOpen: !current } : b));
    }
  };

  const [resubmitting, setResubmitting] = useState<number | null>(null);
  const resubmitBusiness = async (id: number, slug: string) => {
    setResubmitting(id);
    try {
      const res = await fetch(`/api/businesses/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resubmit" }),
      });
      if (res.ok) {
        setBusinesses((prev) => prev.map((b) => b.id === id ? { ...b, status: "pending" } : b));
        toast.success("درخواست بررسی مجدد ارسال شد");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "خطا در ارسال درخواست مجدد");
      }
    } finally {
      setResubmitting(null);
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isPro = sub?.plan === "pro";

  const totals = {
    businesses: businesses.length,
    approved: businesses.filter((b) => b.status === "approved").length,
    pending: businesses.filter((b) => b.status === "pending").length,
    rejected: businesses.filter((b) => b.status === "rejected").length,
    views: businesses.reduce((sum, b) => sum + (b.views || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-6xl mx-auto">
          <BackButton fallback="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-gray-900">فودتراک‌های من</h1>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{businesses.length} فودتراک ثبت‌شده</p>
            </div>
            <Link
              href="/businesses/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold hover:from-orange-600 hover:to-pink-600 transition-all btn-glow"
            >
              <Plus className="w-4 h-4" />
              ثبت فودتراک جدید
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[
              { label: "کل فودتراک‌ها", value: totals.businesses, color: "text-primary" },
              { label: "تایید شده", value: totals.approved, color: "text-green-600" },
              { label: "در انتظار", value: totals.pending, color: "text-orange-500" },
              { label: "رد شده", value: totals.rejected, color: "text-red-500" },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <div className={`text-2xl sm:text-3xl font-extrabold ${item.color}`}>{Number(item.value || 0).toLocaleString("fa-IR")}</div>
                <div className="text-xs text-gray-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          {sub && sub.usage?.businesses >= sub.limits?.businesses && sub.plan === "free" && (
            <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm font-bold text-orange-800">
                به سقف پلن رایگان رسیده‌اید ({sub.limits.businesses} فودتراک). برای ثبت بیشتر ارتقا دهید.
              </span>
              <Link href="/dashboard/subscription" className="text-sm font-bold text-primary hover:underline whitespace-nowrap">
                ارتقای پلن ←
              </Link>
            </div>
          )}

          {/* Subscription expiry countdown / renewal warning — turns red inside the last 7 days */}
          {sub && isPro && typeof sub.daysRemaining === "number" && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap ${
                sub.isExpiringSoon ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-100"
              }`}
            >
              <span className={`text-sm font-bold flex items-center gap-2 ${sub.isExpiringSoon ? "text-red-700" : "text-blue-700"}`}>
                {sub.isExpiringSoon ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CalendarClock className="w-4 h-4 shrink-0" />}
                {sub.daysRemaining > 0
                  ? sub.isExpiringSoon
                    ? `⚠️ اشتراک حرفه‌ای شما تا ${toFaDigits(sub.daysRemaining)} روز دیگر تمام می‌شود.`
                    : `${toFaDigits(sub.daysRemaining)} روز تا پایان اعتبار اشتراک حرفه‌ای شما باقی مانده است.`
                  : "⚠️ اشتراک حرفه‌ای شما به پایان رسیده و به‌زودی به پلن رایگان بازمی‌گردید."}
              </span>
              {sub.canRenew && (
                <Link href="/dashboard/subscription" className={`text-sm font-bold hover:underline whitespace-nowrap ${sub.isExpiringSoon ? "text-red-700" : "text-primary"}`}>
                  تمدید اشتراک ←
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* آمار و گزارش پیشرفته — pro-only advanced reports */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-extrabold text-gray-900">آمار و گزارش پیشرفته</h2>
                {!isPro && (
                  <span className="mr-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3" /> ویژه پلن حرفه‌ای
                  </span>
                )}
              </div>

              {isPro && advanced?.summary ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-2xl p-3.5">
                      <div className="text-xl font-extrabold text-gray-900">{advanced.summary.totalViews.toLocaleString("fa-IR")}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">کل بازدید</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3.5">
                      <div className="text-xl font-extrabold text-gray-900">{advanced.summary.avgRating.toLocaleString("fa-IR")}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">میانگین امتیاز</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3.5">
                      <div className="text-xl font-extrabold text-gray-900">{advanced.summary.totalFavorites.toLocaleString("fa-IR")}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">علاقه‌مندی‌ها</div>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3.5">
                      <div className="text-xl font-extrabold text-gray-900">٪{advanced.summary.engagementRate.toLocaleString("fa-IR")}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">نرخ تعامل</div>
                    </div>
                  </div>

                  {advanced.perBusiness?.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-gray-500 mb-1">عملکرد بازدید هر فودتراک</div>
                      {advanced.perBusiness.map((b: any) => {
                        const maxViews = advanced.perBusiness[0]?.views || 1;
                        const pct = Math.max((b.views / maxViews) * 100, 4);
                        return (
                          <div key={b.id}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium text-gray-700 flex items-center gap-1">
                                {b.name}
                                {advanced.topPerformer?.id === b.id && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">برترین</span>
                                )}
                              </span>
                              <span className="text-gray-400 flex items-center gap-2">
                                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{b.views.toLocaleString("fa-IR")}</span>
                                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{b.favoriteCount.toLocaleString("fa-IR")}</span>
                                <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{b.reviewCount.toLocaleString("fa-IR")}</span>
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center overflow-hidden">
                  <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-4 leading-6">
                    با ارتقا به پلن حرفه‌ای، گزارش تفکیکی بازدید، امتیاز، علاقه‌مندی و نرخ تعامل هر فودتراک را ببینید.
                  </p>
                  <Link
                    href="/dashboard/subscription"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold btn-glow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    ارتقا به حرفه‌ای
                  </Link>
                </div>
              )}
            </div>

            {/* پشتیبانی اختصاصی — dedicated priority support for pro owners */}
            <div className={`rounded-3xl p-5 sm:p-6 flex flex-col ${isPro ? "bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/20" : "bg-white border border-gray-100 shadow-sm"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Headset className={`w-5 h-5 ${isPro ? "text-white" : "text-primary"}`} />
                <h2 className="font-extrabold">پشتیبانی اختصاصی</h2>
              </div>

              {isPro ? (
                <>
                  <p className="text-sm text-white/90 leading-7 mb-5 flex-1">
                    به عنوان مشترک پلن حرفه‌ای، به خط پشتیبانی اولویت‌دار ون‌جا دسترسی دارید. پاسخ‌گویی در کمتر از ۲ ساعت کاری.
                  </p>
                  <div className="space-y-2">
                    <a href="tel:+982100000000" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-sm font-bold">
                      <Phone className="w-4 h-4" />
                      تماس مستقیم پشتیبانی پلاس
                    </a>
                    <a href="https://t.me/vanja_support" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-sm font-bold">
                      <MessageCircle className="w-4 h-4" />
                      چت اختصاصی در تلگرام
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 leading-7 mb-5 flex-1">
                    کاربران پلن رایگان از پشتیبانی عمومی استفاده می‌کنند. با ارتقا به پلن حرفه‌ای، یک خط پشتیبانی اختصاصی و پاسخ‌گویی سریع‌تر دریافت کنید.
                  </p>
                  <Link href="/contact" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-bold mb-2">
                    <MessageCircle className="w-4 h-4" />
                    ارتباط با پشتیبانی عمومی
                  </Link>
                  <Link href="/dashboard/subscription" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 transition-colors text-sm font-bold btn-glow">
                    <Sparkles className="w-4 h-4" />
                    ارتقا برای پشتیبانی اختصاصی
                  </Link>
                </>
              )}
            </div>
          </div>

          {businesses.length ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {businesses.map((biz) => (
                <div key={biz.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="relative h-40 bg-gradient-to-br from-orange-100 to-pink-100">
                    {biz.coverImage ? (
                      <img src={biz.coverImage} alt={biz.name} className="w-full h-full object-cover" />
                    ) : null}
                    <TruckLogoOverlay logo={biz.logo} name={biz.name} size={64} />
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${biz.status === "approved" ? "bg-green-100 text-green-700" : biz.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {biz.status === "approved" ? "تایید شده" : biz.status === "pending" ? "در انتظار" : "رد شده"}
                      </span>
                    </div>
                  </div>
                  <div className={`p-5 ${biz.logo ? "pt-8" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-gray-900 truncate">{biz.name}</h3>
                          {isPro && <VanjaPlusBadge className="shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{biz.city} · {biz.locationText}</p>
                        <CategoryPills categories={biz.categories} className="mt-2" />
                      </div>
                      <button
                        onClick={() => toggleOpen(biz.slug, biz.isOpen)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                          biz.isOpen ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {biz.isOpen ? "باز" : "بسته"}
                      </button>
                    </div>

                    {biz.status === "rejected" && (
                      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-700 mb-0.5">این فودتراک توسط تیم ون جا رد شده است</p>
                          <p className="text-xs text-red-600/80 leading-6 mb-2">
                            اطلاعات فودتراک را بررسی و در صورت نیاز ویرایش کنید، سپس می‌توانید دوباره برای بررسی ارسال کنید.
                          </p>
                          <button
                            disabled={resubmitting === biz.id}
                            onClick={() => resubmitBusiness(biz.id, biz.slug)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                          >
                            {resubmitting === biz.id ? "در حال ارسال..." : "ارسال درخواست مجدد"}
                          </button>
                        </div>
                      </div>
                    )}

                    {biz.description && <p className="text-sm text-gray-600 leading-7 mb-4 line-clamp-2">{biz.description}</p>}

                    {(biz.phone || biz.instagram) && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {biz.phone && (
                          <a
                            href={`tel:${biz.phone}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                            dir="ltr"
                          >
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {biz.phone}
                          </a>
                        )}
                        {biz.instagram && (
                          <a
                            href={`https://instagram.com/${biz.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <InstagramIcon className="w-3.5 h-3.5 text-primary" />
                            @{biz.instagram}
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {(biz.views || 0).toLocaleString("fa-IR")} بازدید
                      </div>
                      {biz.rating && parseFloat(biz.rating) > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {biz.rating} ({biz.reviewCount || 0} نظر)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                      <Link href={`/businesses/${biz.slug}`} target="_blank" className="p-2 rounded-xl text-gray-400 hover:text-primary hover:bg-orange-50 transition-colors" title="مشاهده صفحه">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link href={`/dashboard/owner/edit/${biz.slug}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                        ویرایش
                      </Link>
                      <button onClick={() => deleteBusiness(biz.slug, biz.name)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors mr-auto" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Store className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">هنوز فودتراکی ثبت نکرده‌اید</h3>
              <p className="text-gray-500 text-sm mb-6">اولین فودتراک خود را در ون جا ثبت کنید</p>
              <Link
                href="/businesses/new"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold btn-glow"
              >
                <Plus className="w-4 h-4" />
                ثبت فودتراک
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
