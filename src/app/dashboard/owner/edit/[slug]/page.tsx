"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ImageUpload } from "@/components/image-upload";
import { ImageLightbox } from "@/components/image-lightbox";
import { useCategories } from "@/lib/use-categories";
import {
  Save,
  Plus,
  Trash2,
  Info,
  Clock,
  UtensilsCrossed,
  Images,
  Power,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { getPersianDayName } from "@/lib/utils";
import { IRAN_CITIES } from "@/lib/cities";
import { PLAN_LIMITS, MAX_BUSINESS_CATEGORIES, type PlanId } from "@/lib/plans";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { useToast } from "@/components/toast-provider";

type Tab = "info" | "hours" | "menu" | "photos";

export default function EditBusinessPage() {
  const { slug } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("info");
  const [business, setBusiness] = useState<any>(null);
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<any>({});
  const [hours, setHours] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId>("free");

  const isAdmin = session?.user?.role === "admin";
  const allowContactInfo = isAdmin || PLAN_LIMITS[plan].contactInfo;

  const load = () => {
    fetch(`/api/businesses/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data);
        setForm({
          name: data.name,
          description: data.description || "",
          categoryIds: Array.isArray(data.categories)
            ? data.categories.map((c: any) => c.id)
            : [],
          city: data.city || "تهران",
          locationText: data.locationText,
          locationLink: data.locationLink || "",
          phone: data.phone || "",
          instagram: data.instagram || "",
          isOpen: data.isOpen,
          logo: data.logo || "",
          coverImage: data.coverImage || "",
        });
        setHours(data.hours || []);
        setPhotos(data.photos || []);
        setLoading(false);
        fetch(`/api/menu?businessId=${data.id}`)
          .then((r) => r.json())
          .then((menu) => setMenuItems(Array.isArray(menu) ? menu : []));
        fetch(`/api/menu-categories?businessId=${data.id}`)
          .then((r) => r.json())
          .then((cats) => setMenuCategories(Array.isArray(cats) ? cats : []));
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (!slug) return;
    load();
  }, [slug, status]);

  useEffect(() => {
    if (!session || session.user.role === "admin") return;
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plan) setPlan(data.plan as PlanId);
      })
      .catch(() => {});
  }, [session]);

  const saveInfo = async () => {
    setSaving(true);
    const res = await fetch(`/api/businesses/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast.success("اطلاعات فودتراک ذخیره شد");
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error("خطا در ذخیره اطلاعات");
    }
  };

  const toggleCategory = (id: number) => {
    setForm((prev: any) => {
      const isActive = prev.categoryIds.includes(id);
      if (!isActive && prev.categoryIds.length >= MAX_BUSINESS_CATEGORIES) {
        return prev;
      }
      return {
        ...prev,
        categoryIds: isActive
          ? prev.categoryIds.filter((c: number) => c !== id)
          : [...prev.categoryIds, id],
      };
    });
  };

  const toggleOpen = async () => {
    const newVal = !form.isOpen;
    setForm((p: any) => ({ ...p, isOpen: newVal }));
    await fetch(`/api/businesses/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: newVal }),
    });
  };

  const makeDefaultHours = () => [
    { day: "saturday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "sunday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "monday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "tuesday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    {
      day: "wednesday",
      openTime: "11:00",
      closeTime: "23:00",
      isClosed: false,
    },
    { day: "thursday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "friday", openTime: "", closeTime: "", isClosed: true },
  ];

  const saveHours = async () => {
    setSaving(true);
    await fetch(`/api/businesses/${slug}/hours`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    setSaving(false);
    setSaved(true);
    toast.success("ساعات کاری ذخیره شد");
    setTimeout(() => setSaved(false), 2000);
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const res = await fetch("/api/menu-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id, name }),
    });
    if (res.ok) {
      const row = await res.json();
      setMenuCategories((prev) => [...prev, row]);
      setNewCategoryName("");
      if (!newMenuItem.category) {
        setNewMenuItem((prev) => ({ ...prev, category: row.name }));
      }
    }
  };

  const deleteCategory = async (id: number) => {
    const target = menuCategories.find((c) => c.id === id);
    if (!target) return;
    const ok = await confirmDialog({
      title: "حذف دسته منو",
      description: `دسته «${target.name}» حذف شود؟ آیتم‌های فعلی فقط دسته‌بندی‌شان پاک می‌شود.`,
      confirmText: "حذف دسته",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/menu-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMenuCategories((prev) => prev.filter((c) => c.id !== id));
      setMenuItems((prev) =>
        prev.map((item) =>
          item.category === target.name ? { ...item, category: null } : item,
        ),
      );
      if (newMenuItem.category === target.name) {
        setNewMenuItem((prev) => ({ ...prev, category: "" }));
      }
      toast.success("دسته منو حذف شد");
    } else {
      toast.error("خطا در حذف دسته منو");
    }
  };

  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newMenuItem, businessId: business.id }),
    });
    if (res.ok) {
      const item = await res.json();
      setMenuItems((prev) => [item, ...prev]);
      setNewMenuItem({
        name: "",
        description: "",
        price: "",
        category: newMenuItem.category,
        image: "",
      });
    }
  };

  const deleteMenuItem = async (id: number) => {
    const ok = await confirmDialog({
      title: "حذف آیتم منو",
      description: "این آیتم برای همیشه از منو حذف می‌شود.",
      confirmText: "حذف آیتم",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMenuItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("آیتم منو حذف شد");
    } else {
      toast.error("خطا در حذف آیتم منو");
    }
  };

  const toggleMenuAvailability = async (item: any) => {
    setMenuItems((prev) =>
      prev.map((m) =>
        m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m,
      ),
    );
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
  };

  const addPhoto = async (dataUrl: string) => {
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id, url: dataUrl }),
    });
    if (res.ok) {
      const photo = await res.json();
      setPhotos((prev) => [photo, ...prev]);
    } else {
      const data = await res.json().catch(() => null);
      toast.error(data?.error || "خطا در آپلود عکس");
    }
  };

  const deletePhoto = async (id: number) => {
    const ok = await confirmDialog({
      title: "حذف تصویر",
      description: "این تصویر برای همیشه از گالری حذف می‌شود.",
      confirmText: "حذف تصویر",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success("تصویر حذف شد");
    } else {
      toast.error("خطا در حذف تصویر");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !business) return null;

  const tabs = [
    { id: "info" as Tab, label: "اطلاعات", icon: Info },
    { id: "hours" as Tab, label: "ساعات کاری", icon: Clock },
    { id: "menu" as Tab, label: "منو", icon: UtensilsCrossed },
    { id: "photos" as Tab, label: "تصاویر", icon: Images },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="w-full max-w-4xl">
          <BackButton fallback="/dashboard/owner" label="بازگشت به فودتراک‌های من" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {business.name}
              </h1>
              <p className="text-sm text-gray-500">مدیریت اطلاعات فودتراک</p>
            </div>
            <button
              onClick={toggleOpen}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                form.isOpen
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Power className="w-4 h-4" />
              {form.isOpen ? "هم‌اکنون باز است" : "هم‌اکنون بسته است"}
            </button>
          </div>

          <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-xl border border-gray-100 w-fit overflow-x-auto max-w-full">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUpload
                  label="لوگو"
                  value={form.logo}
                  onChange={(v) => setForm((p: any) => ({ ...p, logo: v }))}
                  aspect="square"
                />
                <ImageUpload
                  label="تصویر کاور"
                  value={form.coverImage}
                  onChange={(v) =>
                    setForm((p: any) => ({ ...p, coverImage: v }))
                  }
                  aspect="wide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  نام فودتراک
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  دسته‌بندی‌های غذایی{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (حداکثر {MAX_BUSINESS_CATEGORIES} مورد)
                  </span>
                </label>
                {categories.length ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const active = (form.categoryIds || []).includes(cat.id);
                      const disabled =
                        !active &&
                        (form.categoryIds || []).length >=
                          MAX_BUSINESS_CATEGORIES;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
                            active
                              ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent"
                              : disabled
                                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {cat.nameFa}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    هنوز دسته‌بندی‌ای توسط ادمین ثبت نشده است.
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {(form.categoryIds || []).length} از {MAX_BUSINESS_CATEGORIES}{" "}
                  دسته انتخاب شده — دسته‌بندی‌ها فقط توسط تیم ون جا مدیریت
                  می‌شوند.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  توضیحات
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  شهر
                </label>
                <select
                  value={form.city}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, city: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                >
                  {IRAN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  موقعیت امروز
                </label>
                <input
                  value={form.locationText}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      locationText: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  لینک گوگل‌مپ
                </label>
                <input
                  value={form.locationLink}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      locationLink: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  اطلاع‌رسانی به مشتری‌ها
                  {!allowContactInfo && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                      <Sparkles className="w-3 h-3" /> ویژه پلن حرفه‌ای
                    </span>
                  )}
                </label>
                {allowContactInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        تلفن
                      </label>
                      <input
                        value={form.phone}
                        onChange={(e) =>
                          setForm((p: any) => ({ ...p, phone: e.target.value }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        اینستاگرام
                      </label>
                      <input
                        value={form.instagram}
                        onChange={(e) =>
                          setForm((p: any) => ({
                            ...p,
                            instagram: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ) : (
                  // Free-plan owners can't set contact info at all — the server silently drops
                  // phone/instagram on save for these accounts, so showing editable inputs here
                  // was misleading (looked saved, never actually was). Show an upgrade prompt
                  // instead, matching the onboarding wizard's gating.
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-gray-500 leading-6">
                      نمایش شماره تماس و آیدی اینستاگرام روی صفحه فودتراک، مخصوص
                      پلن حرفه‌ای است.
                    </p>
                    <Link
                      href="/pricing"
                      className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                    >
                      مشاهده پلن‌ها ←
                    </Link>
                  </div>
                )}
              </div>

              <button
                onClick={saveInfo}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving
                  ? "در حال ذخیره..."
                  : saved
                    ? "ذخیره شد"
                    : "ذخیره تغییرات"}
              </button>
            </div>
          )}

          {tab === "hours" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {hours.length === 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-orange-800 font-medium">
                    برای این فودتراک ساعات کاری ثبت نشده است.
                  </p>
                  <button
                    onClick={() => setHours(makeDefaultHours())}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"
                  >
                    ساخت ساعات پیش‌فرض
                  </button>
                </div>
              )}
              <div className="space-y-3 mb-6">
                {hours.map((h, idx) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-gray-50"
                  >
                    <span className="w-20 font-medium text-sm text-gray-700">
                      {getPersianDayName(h.day)}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={h.isClosed}
                        onChange={(e) => {
                          const newHours = [...hours];
                          newHours[idx] = { ...h, isClosed: e.target.checked };
                          setHours(newHours);
                        }}
                        className="accent-orange-500"
                      />
                      تعطیل
                    </label>
                    {!h.isClosed && (
                      <>
                        <input
                          type="time"
                          value={h.openTime || ""}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[idx] = { ...h, openTime: e.target.value };
                            setHours(newHours);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                        />
                        <span className="text-gray-400 text-sm">تا</span>
                        <input
                          type="time"
                          value={h.closeTime || ""}
                          onChange={(e) => {
                            const newHours = [...hours];
                            newHours[idx] = { ...h, closeTime: e.target.value };
                            setHours(newHours);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={saveHours}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving
                  ? "در حال ذخیره..."
                  : saved
                    ? "ذخیره شد"
                    : "ذخیره ساعات کاری"}
              </button>
            </div>
          )}

          {tab === "menu" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">
                    دسته‌بندی‌های منو
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input
                      placeholder="مثلا: برگر، نوشیدنی، دسر"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <button
                      onClick={addCategory}
                      type="button"
                      className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      افزودن دسته
                    </button>
                  </div>
                  {menuCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {menuCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700"
                        >
                          <span>{cat.name}</span>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            type="button"
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      هنوز دسته‌ای برای منو نساخته‌اید.
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-bold text-gray-900 mb-4">
                    افزودن آیتم جدید
                  </h3>
                  <div className="mb-3">
                    <ImageUpload
                      label="تصویر آیتم منو"
                      value={newMenuItem.image}
                      onChange={(v) =>
                        setNewMenuItem((p) => ({ ...p, image: v }))
                      }
                      aspect="wide"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      placeholder="نام محصول"
                      value={newMenuItem.name}
                      onChange={(e) =>
                        setNewMenuItem((p) => ({ ...p, name: e.target.value }))
                      }
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <input
                      placeholder="قیمت (تومان)"
                      type="number"
                      value={newMenuItem.price}
                      onChange={(e) =>
                        setNewMenuItem((p) => ({ ...p, price: e.target.value }))
                      }
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <select
                      value={newMenuItem.category}
                      onChange={(e) =>
                        setNewMenuItem((p) => ({
                          ...p,
                          category: e.target.value,
                        }))
                      }
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value="">بدون دسته‌بندی</option>
                      {menuCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="توضیحات کوتاه"
                      value={newMenuItem.description}
                      onChange={(e) =>
                        setNewMenuItem((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <button
                    onClick={addMenuItem}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    افزودن به منو
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">
                  آیتم‌های منو ({menuItems.length})
                </h3>
                {menuItems.length ? (
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50"
                      >
                        {item.image && (
                          <button
                            onClick={() => setPreviewImage(item.image)}
                            className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100"
                          >
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                            {item.name}
                            {item.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                                {item.category}
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                                ناموجود
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">
                            {Number(item.price).toLocaleString("fa-IR")} ت
                          </span>
                          <button
                            onClick={() => toggleMenuAvailability(item)}
                            className="text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                          >
                            {item.isAvailable ? "ناموجود کن" : "موجود کن"}
                          </button>
                          <button
                            onClick={() => deleteMenuItem(item.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">
                    هنوز آیتمی به منو اضافه نشده است
                  </p>
                )}
              </div>
            </div>
          )}

          {tab === "photos" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">گالری تصاویر</h3>
                <span className="text-xs font-bold text-gray-400">
                  {photos.length.toLocaleString("fa-IR")} /{" "}
                  {(
                    PLAN_LIMITS[business.ownerPlan as "free" | "pro"]?.photos ??
                    PLAN_LIMITS.free.photos
                  ).toLocaleString("fa-IR")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden h-32"
                  >
                    <button
                      onClick={() => setPreviewImage(photo.url)}
                      className="w-full h-full"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || business.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
                <ImageUpload value="" onChange={addPhoto} aspect="square" />
              </div>
              <p className="text-xs text-gray-400">
                حداکثر حجم هر تصویر ۴ مگابایت
              </p>
            </div>
          )}
        </div>
      </main>
      <ImageLightbox src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
