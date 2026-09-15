"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { TruckLogoOverlay, CategoryPills } from "@/components/business-card";
import { InstagramIcon } from "@/components/social-icons";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { useToast } from "@/components/toast-provider";
import {
  CalendarClock,
  CheckCircle,
  ExternalLink,
  FolderTree,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  Users,
  XCircle,
  Crown,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { CATEGORY_ICON_OPTIONS, DEFAULT_CATEGORY_COLOR, getCategoryIcon } from "@/lib/category-icons";
import { clearCategoriesClientCache } from "@/lib/use-categories";
import { ImageLightbox } from "@/components/image-lightbox";
import { FieldError, FieldHint, compactInputClass } from "@/components/field-error";
import {
  emailCharsOnly,
  phoneCharsOnly,
  runValidators,
  validateEmail,
  validateEnum,
  validateFoodCategoryName,
  validateHexColor,
  validateMobile,
  validateNewPassword,
  validatePersonName,
  type FieldErrors,
} from "@/lib/validators";
import { BackButton } from "@/components/back-button";

type Tab = "businesses" | "users" | "admins" | "categories" | "reviews";

type CategoryForm = { id?: number; nameFa: string; icon: string; color: string };
type AdminForm = { id?: number; name: string; email: string; phone: string; password: string };

const emptyCategory: CategoryForm = { nameFa: "", icon: "utensils", color: DEFAULT_CATEGORY_COLOR };
const emptyAdmin: AdminForm = { name: "", email: "", phone: "", password: "" };

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const isFounder = session?.user?.role === "founder";

  const [activeTab, setActiveTab] = useState<Tab>("businesses");
  const [stats, setStats] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [businessFilter, setBusinessFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [adminForm, setAdminForm] = useState<AdminForm>(emptyAdmin);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminFieldErrors, setAdminFieldErrors] = useState<FieldErrors<"name" | "email" | "phone" | "password">>({});
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<FieldErrors<"nameFa" | "icon" | "color">>({});
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const loadAll = async () => {
    const requests: Promise<any>[] = [
      fetch("/api/admin?type=stats").then((r) => r.json()),
      fetch("/api/admin?type=businesses").then((r) => r.json()),
      fetch("/api/admin?type=users").then((r) => r.json()),
      fetch("/api/admin?type=categories").then((r) => r.json()),
      fetch("/api/admin?type=reviews").then((r) => r.json()),
    ];
    if (isFounder) requests.push(fetch("/api/admin?type=admins").then((r) => r.json()));

    const [statsRes, bizRes, usersRes, catsRes, reviewsRes, adminsRes] = await Promise.all(requests);
    setStats(statsRes.stats || null);
    setBusinesses(Array.isArray(bizRes) ? bizRes : []);
    setUsers(Array.isArray(usersRes) ? usersRes : []);
    setCategories(Array.isArray(catsRes) ? catsRes : []);
    setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
    setAdmins(isFounder && Array.isArray(adminsRes) ? adminsRes : []);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "admin" && session?.user?.role !== "founder") {
      router.push(session?.user?.role === "owner" ? "/dashboard/owner" : "/businesses");
      return;
    }
    if (status === "authenticated" && (session?.user?.role === "admin" || session?.user?.role === "founder")) {
      const fetchAdminData = async () => {
        setLoading(true);
        try {
          const requests: Promise<any>[] = [
            fetch("/api/admin?type=stats").then((r) => r.json()),
            fetch("/api/admin?type=businesses").then((r) => r.json()),
            fetch("/api/admin?type=users").then((r) => r.json()),
            fetch("/api/admin?type=categories").then((r) => r.json()),
            fetch("/api/admin?type=reviews").then((r) => r.json()),
          ];
          if (isFounder) requests.push(fetch("/api/admin?type=admins").then((r) => r.json()));

          const [statsRes, bizRes, usersRes, catsRes, reviewsRes, adminsRes] = await Promise.all(requests);
          setStats(statsRes.stats || null);
          setBusinesses(Array.isArray(bizRes) ? bizRes : []);
          setUsers(Array.isArray(usersRes) ? usersRes : []);
          setCategories(Array.isArray(catsRes) ? catsRes : []);
          setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
          setAdmins(isFounder && Array.isArray(adminsRes) ? adminsRes : []);
        } catch {
        } finally {
          setLoading(false);
        }
      };
      fetchAdminData();
    }
  }, [session, status, router, isFounder]);

  const filteredBiz = useMemo(
    () => businessFilter === "all" ? businesses : businesses.filter((b) => b.status === businessFilter),
    [businesses, businessFilter]
  );

  const updateBusinessStatus = async (id: number, newStatus: string) => {
    setBusy(true);
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "businessStatus", id, status: newStatus }),
    });
    if (res.ok) {
      setBusinesses((prev) => prev.map((b) => b.id === id ? { ...b, status: newStatus } : b));
      await loadAll();
      toast.success(
        newStatus === "approved" ? "فودتراک تایید شد" : newStatus === "rejected" ? "فودتراک رد شد" : "فودتراک برای بررسی مجدد ارسال شد"
      );
    } else {
      toast.error("خطا در بروزرسانی وضعیت فودتراک");
    }
    setBusy(false);
  };

  const updateUserPlan = async (id: number, plan: string) => {
    setBusy(true);
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "userPlan", id, plan }),
    });
    if (res.ok) {
      await loadAll();
      toast.success("پلن کاربر بروزرسانی شد");
    } else {
      toast.error("خطا در تغییر پلن کاربر");
    }
    setBusy(false);
  };

  const deleteLabels: Record<string, { title: string; description: string; confirmText: string }> = {
    business: {
      title: "حذف فودتراک",
      description: "این فودتراک برای همیشه حذف می‌شود و قابل بازگشت نیست.",
      confirmText: "حذف فودتراک",
    },
    review: {
      title: "حذف نظر",
      description: "این نظر برای همیشه حذف می‌شود و قابل بازگشت نیست.",
      confirmText: "حذف نظر",
    },
    user: {
      title: "حذف حساب کاربری",
      description: "این حساب برای همیشه حذف می‌شود و قابل بازگشت نیست.",
      confirmText: "حذف حساب",
    },
    category: {
      title: "حذف دسته‌بندی",
      description: "این دسته‌بندی از همه فودتراک‌ها حذف می‌شود. این عمل قابل بازگشت نیست.",
      confirmText: "حذف دسته",
    },
  };

  const deleteItem = async (type: "business" | "review" | "user" | "category", id: number) => {
    const labels = deleteLabels[type];
    const ok = await confirmDialog({ ...labels, variant: "danger" });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/admin?type=${type}&id=${id}`, { method: "DELETE" });
    if (res.ok) {
      if (type === "category") void clearCategoriesClientCache();
      await loadAll();
      toast.success("با موفقیت حذف شد");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "خطا در حذف");
    }
    setBusy(false);
  };

  const validateCategoryForm = () =>
    runValidators({
      nameFa: validateFoodCategoryName(categoryForm.nameFa),
      icon: validateEnum(categoryForm.icon, CATEGORY_ICON_OPTIONS.map((o) => o.key), "آیکون دسته‌بندی"),
      color: validateHexColor(categoryForm.color),
    });

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError("");
    const check = validateCategoryForm();
    setCategoryFieldErrors(check.errors);
    if (!check.valid) return;
    setBusy(true);
    const isEdit = Boolean(categoryForm.id);
    const res = await fetch("/api/admin", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "category", id: categoryForm.id, ...check.values }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCategoryForm(emptyCategory);
      setCategoryFieldErrors({});
      // Server cache was invalidated by the API; drop the browser copy too so the homepage /
      // trucks filters show the change on the very next navigation.
      void clearCategoriesClientCache();
      await loadAll();
      toast.success(isEdit ? "دسته‌بندی بروزرسانی شد" : "دسته‌بندی جدید افزوده شد");
    } else {
      if (data.errors && typeof data.errors === "object") setCategoryFieldErrors(data.errors);
      setCategoryError(data.error || "خطایی رخ داد");
    }
    setBusy(false);
  };

  const startEditCategory = (cat: any) => {
    setCategoryError("");
    setCategoryFieldErrors({});
    setCategoryForm({
      id: cat.id,
      nameFa: cat.nameFa || "",
      icon: cat.icon || "utensils",
      color: cat.color || DEFAULT_CATEGORY_COLOR,
    });
  };

  const cancelEditCategory = () => {
    setCategoryError("");
    setCategoryFieldErrors({});
    setCategoryForm(emptyCategory);
  };

  /** Admin accounts: Persian full name, valid e-mail, *required* Iranian mobile, strong password
   *  (mandatory on create, optional on edit — but validated whenever it is filled in). */
  const validateAdminForm = (form: AdminForm) =>
    runValidators({
      name: validatePersonName(form.name),
      email: validateEmail(form.email),
      phone: validateMobile(form.phone, true),
      password: validateNewPassword(form.password, !form.id, form.id ? "رمز عبور جدید" : "رمز عبور"),
    });

  const updateAdminField = (field: keyof AdminForm, raw: string) => {
    const value = field === "phone" ? phoneCharsOnly(raw) : field === "email" ? emailCharsOnly(raw) : raw;
    setAdminForm((p) => ({ ...p, [field]: value }));
    if (adminFieldErrors[field as keyof typeof adminFieldErrors]) {
      setAdminFieldErrors((p) => ({ ...p, [field]: undefined }));
    }
  };

  const blurAdminField = (field: "name" | "email" | "phone" | "password") => {
    const check = validateAdminForm(adminForm);
    setAdminFieldErrors((p) => ({ ...p, [field]: check.errors[field] }));
  };

  const saveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    const check = validateAdminForm(adminForm);
    setAdminFieldErrors(check.errors);
    if (!check.valid) return;
    setBusy(true);
    const isEdit = Boolean(adminForm.id);
    const res = await fetch("/api/admin", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? {
              action: "updateAdmin",
              id: adminForm.id,
              name: check.values.name,
              email: check.values.email,
              phone: check.values.phone,
              password: check.values.password || undefined,
            }
          : { action: "admin", ...check.values }
      ),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAdminForm(emptyAdmin);
      setAdminFieldErrors({});
      await loadAll();
      toast.success(isEdit ? "اطلاعات ادمین بروزرسانی شد" : "ادمین جدید ساخته شد");
    } else {
      if (data.errors && typeof data.errors === "object") setAdminFieldErrors(data.errors);
      setAdminError(data.error || "خطایی رخ داد");
    }
    setBusy(false);
  };

  const startEditAdmin = (admin: any) => {
    setAdminError("");
    setAdminFieldErrors({});
    setAdminForm({ id: admin.id, name: admin.name || "", email: admin.email || "", phone: admin.phone || "", password: "" });
  };

  const cancelEditAdmin = () => {
    setAdminError("");
    setAdminFieldErrors({});
    setAdminForm(emptyAdmin);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const tabs: { id: Tab; label: string; icon: any; count?: number; show?: boolean }[] = [
    { id: "businesses", label: "فودتراک‌ها", icon: Store, count: businesses.length },
    { id: "users", label: "کاربران", icon: Users, count: users.length },
    { id: "admins", label: "مدیریت ادمین‌ها", icon: Shield, count: admins.length, show: isFounder },
    { id: "categories", label: "دسته‌های غذایی", icon: FolderTree, count: categories.length },
    { id: "reviews", label: "نظرات", icon: MessageSquare, count: reviews.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-7xl mx-auto">
          <BackButton fallback="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isFounder ? "دسترسی بنیان‌گذار" : "دسترسی ادمین"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">داشبورد</h1>
            <p className="text-sm text-gray-500 mt-1">کنترل کامل محتوا، فودتراک‌ها، کاربران و اشتراک‌ها</p>
          </div>

          {/* Global stats always visible */}
          {stats && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {[
                { label: "کل فودتراک‌ها", value: stats.businesses, icon: Store, color: "text-primary" },
                { label: "در انتظار تایید", value: stats.pending, icon: ShieldCheck, color: "text-orange-500", hot: stats.pending > 0 },
                { label: "کل کاربران", value: stats.users, icon: Users, color: "text-blue-500" },
                { label: "مالکان", value: stats.owners, icon: Crown, color: "text-purple-500" },
                ...(isFounder ? [{ label: "ادمین‌ها", value: stats.admins, icon: Shield, color: "text-indigo-500" }] : []),
                { label: "نظرات", value: stats.reviews, icon: MessageSquare, color: "text-amber-500" },
                { label: "دسته‌های غذایی", value: stats.categories, icon: FolderTree, color: "text-green-500" },
                { label: "آیتم منو", value: stats.menuItems, icon: Star, color: "text-pink-500" },
                { label: "تایید شده", value: stats.approved, icon: CheckCircle, color: "text-emerald-500" },
                { label: "رد شده", value: stats.rejected, icon: XCircle, color: "text-red-500" },
              ].map((item) => (
                <div key={item.label} className={`bg-white rounded-3xl border p-5 shadow-sm ${item.hot ? "border-orange-300 ring-1 ring-orange-200" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    {item.hot && <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{Number(item.value || 0).toLocaleString("fa-IR")}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto pb-2 mb-6">
            <div className="inline-flex gap-2 min-w-max bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
              {tabs.filter((t) => t.show !== false).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === tab.id ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {typeof tab.count === "number" && <span className="text-xs opacity-80">{tab.count.toLocaleString("fa-IR")}</span>}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "businesses" && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                  <button key={status} onClick={() => setBusinessFilter(status)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${businessFilter === status ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                    {status === "all" ? "همه" : status === "pending" ? "در انتظار" : status === "approved" ? "تایید شده" : "رد شده"}
                  </button>
                ))}
              </div>

              {filteredBiz.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                  <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {businessFilter === "all"
                      ? "هنوز هیچ فودتراکی ثبت نشده است."
                      : businessFilter === "pending"
                      ? "هیچ فودتراکی در انتظار تایید نیست."
                      : businessFilter === "approved"
                      ? "هیچ فودتراک تایید شده‌ای وجود ندارد."
                      : "هیچ فودتراک رد شده‌ای وجود ندارد."}
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredBiz.map((biz) => (
                  <div key={biz.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="relative h-40 bg-gradient-to-br from-orange-100 to-pink-100">
                      {biz.coverImage ? (
                        <img src={biz.coverImage} alt={biz.name} className="w-full h-full object-cover" />
                      ) : null}
                      <TruckLogoOverlay logo={biz.logo} name={biz.name} size={64} />
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${biz.status === "approved" ? "bg-green-500/90 text-white" : biz.status === "pending" ? "bg-yellow-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                          {biz.status === "approved" ? "تایید" : biz.status === "pending" ? "در انتظار" : "رد"}
                        </span>
                      </div>
                      <Link href={`/businesses/${biz.slug}`} target="_blank" className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-white text-gray-500 hover:text-primary shadow-sm">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                    <div className={`p-5 ${biz.logo ? "pt-8" : ""}`}>
                      <div className="mb-3">
                        <h3 className="font-extrabold text-gray-900 truncate">{biz.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{biz.city} — {biz.locationText}</p>
                        <p className="text-xs text-gray-400 mt-0.5">مالک: {biz.ownerName} · {biz.ownerEmail}</p>
                        <CategoryPills categories={biz.categories} className="mt-2" />
                      </div>

                      {(biz.phone || biz.instagram) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {biz.phone && (
                            <a
                              href={`tel:${biz.phone}`}
                              onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <InstagramIcon className="w-3.5 h-3.5 text-primary" />
                              @{biz.instagram}
                            </a>
                          )}
                        </div>
                      )}

                      {biz.description && <p className="text-sm text-gray-600 leading-7 mb-4 line-clamp-3">{biz.description}</p>}

                      {/* Private ownership-verification photo — visible to admins only, never on the public page */}
                      {biz.verificationPhoto ? (
                        <button
                          type="button"
                          onClick={() => setVerificationPreview(biz.verificationPhoto)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 transition-colors mb-4 text-right"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white shrink-0 border border-emerald-100">
                            <img src={biz.verificationPhoto} alt="عکس احراز هویت" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              عکس احراز هویت فودتراک
                            </div>
                            <p className="text-[11px] text-emerald-700/80 mt-0.5">فقط برای بررسی ادمین — روی صفحه عمومی نمایش داده نمی‌شود. برای بزرگ‌نمایی کلیک کنید.</p>
                          </div>
                          <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-gray-50 border border-dashed border-gray-200 mb-4 text-[11px] text-gray-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          بدون عکس احراز هویت (ثبت‌شده قبل از فعال‌سازی این مرحله)
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                        <span>بازدید: {Number(biz.views || 0).toLocaleString("fa-IR")}</span>
                        <span>امتیاز: {biz.rating || 0} ({Number(biz.reviewCount || 0).toLocaleString("fa-IR")})</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                        {biz.status !== "approved" && <button disabled={busy} onClick={() => updateBusinessStatus(biz.id, "approved")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200"><CheckCircle className="w-3.5 h-3.5" />تایید</button>}
                        {biz.status !== "rejected" && <button disabled={busy} onClick={() => updateBusinessStatus(biz.id, "rejected")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200"><XCircle className="w-3.5 h-3.5" />رد</button>}
                        {biz.status !== "pending" && <button disabled={busy} onClick={() => updateBusinessStatus(biz.id, "pending")} className="px-3 py-2 rounded-xl text-xs font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200">بررسی مجدد</button>}
                        <button disabled={busy} onClick={() => deleteItem("business", biz.id)} className="mr-auto p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </section>
          )}

          {activeTab === "users" && (
            users.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">هنوز کاربری ثبت‌نام نکرده است.</p>
              </div>
            ) : (
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {users.map((user) => (
                <div key={user.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-gray-900 truncate">{user.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === "owner" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>{user.role === "owner" ? "مالک" : "کاربر"}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email} · {user.phone || "بدون موبایل"}</p>
                      <p className="text-xs text-gray-400 mt-1">عضویت: {new Date(user.createdAt).toLocaleDateString("fa-IR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                    {user.role === "owner" ? (
                      <select disabled={busy} value={user.plan || "free"} onChange={(e) => updateUserPlan(user.id, e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold">
                        <option value="free">پلن رایگان</option>
                        <option value="pro">پلن حرفه‌ای</option>
                      </select>
                    ) : (
                      <span className="px-3 py-2 rounded-xl bg-gray-50 text-gray-400 text-xs font-bold">بدون اشتراک</span>
                    )}
                    {user.role === "owner" && user.planExpiresAt && <span className="text-[11px] text-gray-400 inline-flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{new Date(user.planExpiresAt).toLocaleDateString("fa-IR")}</span>}
                    <button disabled={busy} onClick={() => deleteItem("user", user.id)} className="mr-auto p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </section>
            )
          )}

          {activeTab === "admins" && isFounder && (
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <form onSubmit={saveAdmin} noValidate className="xl:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 h-fit space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-900">{adminForm.id ? "ویرایش ادمین" : "افزودن ادمین جدید"}</h3>
                  {adminForm.id && (
                    <button type="button" onClick={cancelEditAdmin} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                      انصراف
                    </button>
                  )}
                </div>
                {adminError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold" role="alert">{adminError}</div>}
                <div>
                  <label htmlFor="admin-name" className="block text-xs font-bold text-gray-500 mb-1.5">
                    نام و نام خانوادگی <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-name"
                    value={adminForm.name}
                    onChange={(e) => updateAdminField("name", e.target.value)}
                    onBlur={() => blurAdminField("name")}
                    placeholder="مثلاً: سارا احمدی"
                    maxLength={50}
                    autoComplete="off"
                    aria-invalid={!!adminFieldErrors.name}
                    className={compactInputClass(adminFieldErrors.name)}
                  />
                  <FieldError error={adminFieldErrors.name} />
                  {!adminFieldErrors.name && <FieldHint>فقط حروف فارسی</FieldHint>}
                </div>
                <div>
                  <label htmlFor="admin-email" className="block text-xs font-bold text-gray-500 mb-1.5">
                    ایمیل <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    inputMode="email"
                    value={adminForm.email}
                    onChange={(e) => updateAdminField("email", e.target.value)}
                    onBlur={() => blurAdminField("email")}
                    placeholder="email@example.com"
                    dir="ltr"
                    maxLength={254}
                    autoComplete="off"
                    aria-invalid={!!adminFieldErrors.email}
                    className={compactInputClass(adminFieldErrors.email, "text-left")}
                  />
                  <FieldError error={adminFieldErrors.email} />
                </div>
                <div>
                  <label htmlFor="admin-phone" className="block text-xs font-bold text-gray-500 mb-1.5">
                    شماره موبایل <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-phone"
                    type="tel"
                    inputMode="numeric"
                    value={adminForm.phone}
                    onChange={(e) => updateAdminField("phone", e.target.value)}
                    onBlur={() => blurAdminField("phone")}
                    placeholder="09123456789"
                    dir="ltr"
                    maxLength={14}
                    autoComplete="off"
                    aria-invalid={!!adminFieldErrors.phone}
                    className={compactInputClass(adminFieldErrors.phone, "text-left")}
                  />
                  <FieldError error={adminFieldErrors.phone} />
                  {!adminFieldErrors.phone && <FieldHint>۱۱ رقم و با ۰۹ شروع شود</FieldHint>}
                </div>
                <div>
                  <label htmlFor="admin-password" className="block text-xs font-bold text-gray-500 mb-1.5">
                    {adminForm.id ? "رمز عبور جدید (اختیاری)" : <>رمز عبور <span className="text-red-500">*</span></>}
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      value={adminForm.password}
                      onChange={(e) => updateAdminField("password", e.target.value)}
                      onBlur={() => blurAdminField("password")}
                      type={showAdminPassword ? "text" : "password"}
                      dir="ltr"
                      maxLength={72}
                      autoComplete="new-password"
                      placeholder={adminForm.id ? "برای تغییر، رمز جدید را وارد کنید" : "حداقل ۸ کاراکتر شامل حرف و عدد"}
                      aria-invalid={!!adminFieldErrors.password}
                      className={compactInputClass(adminFieldErrors.password, "pl-10 text-left")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                      aria-label={showAdminPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <FieldError error={adminFieldErrors.password} />
                  {!adminFieldErrors.password && <FieldHint>حداقل ۸ کاراکتر، شامل حداقل یک حرف انگلیسی و یک عدد</FieldHint>}
                </div>
                <button disabled={busy} className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                  {adminForm.id ? "ذخیره تغییرات" : "ساخت ادمین"}
                </button>
              </form>

              <div className="xl:col-span-2">
                {admins.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {admins.map((admin) => (
                      <div key={admin.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-gray-900 truncate">{admin.name}</h3>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{admin.email} · {admin.phone || "بدون موبایل"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
                          <button disabled={busy} onClick={() => startEditAdmin(admin)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 disabled:opacity-50">
                            ویرایش
                          </button>
                          <button disabled={busy} onClick={() => deleteItem("user", admin.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-50">
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف ادمین
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                    <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">هنوز ادمین اضافه نکردید. از فرم کناری اولین ادمین را بسازید.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "categories" && (
            <section className="space-y-10">
              <div>
                <form onSubmit={saveCategory} noValidate className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6 grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-gray-900">{categoryForm.id ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}</h4>
                    {categoryForm.id && (
                      <button type="button" onClick={cancelEditCategory} className="text-xs font-bold text-gray-400 hover:text-gray-600">
                        انصراف از ویرایش
                      </button>
                    )}
                  </div>
                  {categoryError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{categoryError}</div>
                  )}
                  <div>
                    <label htmlFor="category-name" className="block text-xs font-bold text-gray-500 mb-2">
                      نام دسته‌بندی <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="category-name"
                      value={categoryForm.nameFa}
                      onChange={(e) => {
                        setCategoryForm((p) => ({ ...p, nameFa: e.target.value }));
                        if (categoryFieldErrors.nameFa) setCategoryFieldErrors((p) => ({ ...p, nameFa: undefined }));
                      }}
                      onBlur={() => setCategoryFieldErrors((p) => ({ ...p, nameFa: validateFoodCategoryName(categoryForm.nameFa).error ?? undefined }))}
                      placeholder="نام دسته‌بندی (مثلا: پیتزا)"
                      maxLength={40}
                      aria-invalid={!!categoryFieldErrors.nameFa}
                      className={compactInputClass(categoryFieldErrors.nameFa)}
                    />
                    <FieldError error={categoryFieldErrors.nameFa} />
                    {!categoryFieldErrors.nameFa && <FieldHint>فقط حروف فارسی، ۲ تا ۴۰ کاراکتر</FieldHint>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">لوگو / آیکون دسته‌بندی</label>
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                      {CATEGORY_ICON_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const selected = categoryForm.icon === opt.key;
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            title={opt.label}
                            onClick={() => setCategoryForm((p) => ({ ...p, icon: opt.key }))}
                            className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                              selected ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-orange-200"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">رنگ دسته‌بندی</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm((p) => ({ ...p, color: e.target.value }))}
                        className="w-12 h-11 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer p-1"
                      />
                      <input
                        value={categoryForm.color}
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^#0-9a-fA-F]/g, "").slice(0, 7);
                          setCategoryForm((p) => ({ ...p, color: next.startsWith("#") || next === "" ? next : `#${next}` }));
                          if (categoryFieldErrors.color) setCategoryFieldErrors((p) => ({ ...p, color: undefined }));
                        }}
                        onBlur={() => setCategoryFieldErrors((p) => ({ ...p, color: validateHexColor(categoryForm.color).error ?? undefined }))}
                        placeholder="#F97316"
                        dir="ltr"
                        maxLength={7}
                        aria-invalid={!!categoryFieldErrors.color}
                        className={compactInputClass(categoryFieldErrors.color, "flex-1 text-left")}
                      />
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: categoryForm.color || DEFAULT_CATEGORY_COLOR }}
                      >
                        {(() => {
                          const PreviewIcon = getCategoryIcon(categoryForm.icon);
                          return <PreviewIcon className="w-5 h-5" />;
                        })()}
                      </div>
                    </div>
                    <FieldError error={categoryFieldErrors.color} />
                  </div>

                  <button
                    disabled={busy}
                    className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {categoryForm.id ? "بروزرسانی دسته‌بندی" : "افزودن دسته‌بندی"}
                  </button>
                </form>

                {categories.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {categories.map((cat) => {
                      const CatIcon = getCategoryIcon(cat.icon);
                      return (
                      <div key={cat.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-start gap-3 mb-4">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm"
                            style={{ backgroundColor: cat.color || DEFAULT_CATEGORY_COLOR }}
                          >
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-gray-900 truncate">{cat.nameFa}</h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            {Number(cat.businessCount || 0).toLocaleString("fa-IR")} فودتراک
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={busy}
                              onClick={() => startEditCategory(cat)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
                            >
                              ویرایش
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => deleteItem("category", cat.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                    <FolderTree className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">هنوز دسته‌بندی‌ای ثبت نشده است. از فرم بالا اولین دسته را اضافه کنید.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "reviews" && (
            reviews.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">هنوز نظری ثبت نشده است.</p>
              </div>
            ) : (
            <section className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-extrabold text-gray-900">{review.rating}/5</span>
                      <span className="text-xs text-gray-400">برای</span>
                      <Link href={`/businesses/${review.businessSlug}`} target="_blank" className="text-xs font-bold text-primary hover:underline">{review.businessName}</Link>
                    </div>
                    <p className="text-sm text-gray-600 leading-7">{review.comment || "بدون متن"}</p>
                    <p className="text-xs text-gray-400 mt-1">{review.userName} · {review.userEmail} · {new Date(review.createdAt).toLocaleDateString("fa-IR")}</p>
                  </div>
                  <button onClick={() => deleteItem("review", review.id)} className="self-start p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </section>
            )
          )}

        </div>
      </main>
      <ImageLightbox src={verificationPreview} alt="عکس احراز هویت فودتراک" onClose={() => setVerificationPreview(null)} />
    </div>
  );
}
