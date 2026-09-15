"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ImageUpload } from "@/components/image-upload";
import { IRAN_CITIES } from "@/lib/cities";
import { useCategories } from "@/lib/use-categories";
import {
  Store,
  MapPin,
  Send,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Info,
  Clock,
  Image as ImageIcon,
  UtensilsCrossed,
  Plus,
  Trash2,
  Tags,
  Sparkles,
  ShieldCheck,
  Lock,
  EyeOff,
  Camera,
} from "lucide-react";
import { getPersianDayName } from "@/lib/utils";
import { PLAN_LIMITS, MAX_BUSINESS_CATEGORIES, type PlanId } from "@/lib/plans";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { FieldError, FieldHint, inputClass } from "@/components/field-error";
import {
  digitsOnly,
  instagramCharsOnly,
  phoneCharsOnly,
  runValidators,
  validateAddress,
  validateBusinessName,
  validateBusinessPhone,
  validateCity,
  validateDescription,
  validateHours,
  validateIdList,
  validateInstagram,
  validateMapLink,
  validateMenuCategoryName,
  validateMenuItemDescription,
  validateMenuItemName,
  validatePrice,
  type FieldErrors,
} from "@/lib/validators";
import { BackButton } from "@/components/back-button";

type MenuItemDraft = { name: string; description: string; price: string; category: string; image: string };

const TOTAL_STEPS = 6;

const STEP_LABELS = ["اطلاعات پایه", "موقعیت", "ساعات کاری", "منو", "تصاویر", "احراز هویت"];

export default function NewBusinessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanId>("free");

  const isAdmin = session?.user?.role === "admin";
  const photoLimit = isAdmin ? Infinity : PLAN_LIMITS[plan].photos;
  const menuItemLimit = isAdmin ? Infinity : PLAN_LIMITS[plan].menuItems;

  // Shared, cached category list (same source as the homepage / trucks filters)
  const { categories, loading: categoriesLoading } = useCategories();

  // Private photo of the actual truck, used only by the admin team to verify the business.
  const [verificationPhoto, setVerificationPhoto] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryIds: [] as number[],
    city: "تهران",
    locationText: "",
    locationLink: "",
    phone: "",
    instagram: "",
    website: "",
    logo: "",
    coverImage: "",
  });

  const [hours, setHours] = useState([
    { day: "saturday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "sunday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "monday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "tuesday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "wednesday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "thursday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { day: "friday", openTime: "", closeTime: "", isClosed: true },
  ]);

  const [menuItems, setMenuItems] = useState<MenuItemDraft[]>([]);
  const [newMenuItem, setNewMenuItem] = useState<MenuItemDraft>({ name: "", description: "", price: "", category: "", image: "" });
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [photos, setPhotos] = useState<string[]>([]);

  type FormField = "name" | "description" | "categoryIds" | "city" | "locationText" | "locationLink" | "phone" | "instagram" | "hours";
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<FormField>>({});
  const [menuItemErrors, setMenuItemErrors] = useState<FieldErrors<"name" | "price" | "description">>({});
  const [menuCategoryError, setMenuCategoryError] = useState("");

  const clearFieldError = (field: FormField) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /** Validate a single wizard field (used on blur). */
  const checkField = (field: FormField) => {
    const res =
      field === "name" ? validateBusinessName(form.name)
      : field === "description" ? validateDescription(form.description)
      : field === "locationText" ? validateAddress(form.locationText)
      : field === "locationLink" ? validateMapLink(form.locationLink, false)
      : field === "phone" ? validateBusinessPhone(form.phone, false)
      : field === "instagram" ? validateInstagram(form.instagram, false)
      : field === "city" ? validateCity(form.city)
      : null;
    if (res) setFieldErrors((prev) => ({ ...prev, [field]: res.error ?? undefined }));
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/businesses/new");
    }
  }, [status, router]);

  useEffect(() => {
    if (!session || session.user.role === "admin") return;
    fetch("/api/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plan) setPlan(data.plan as PlanId);
      })
      .catch(() => {});
  }, [session]);

  const handleChange = (field: string, raw: string) => {
    // Restrict what can even be typed into strictly-formatted fields.
    const value = field === "phone" ? phoneCharsOnly(raw) : field === "instagram" ? instagramCharsOnly(raw) : raw;
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field as FormField);
  };

  const toggleCategory = (id: number) => {
    setForm((prev) => {
      const isActive = prev.categoryIds.includes(id);
      if (!isActive && prev.categoryIds.length >= MAX_BUSINESS_CATEGORIES) {
        setError(`حداکثر ${MAX_BUSINESS_CATEGORIES} دسته‌بندی می‌توانید انتخاب کنید`);
        return prev;
      }
      setError("");
      clearFieldError("categoryIds");
      return {
        ...prev,
        categoryIds: isActive
          ? prev.categoryIds.filter((c) => c !== id)
          : [...prev.categoryIds, id],
      };
    });
  };

  const addMenuItemDraft = () => {
    const check = runValidators({
      name: validateMenuItemName(newMenuItem.name),
      price: validatePrice(newMenuItem.price),
      description: validateMenuItemDescription(newMenuItem.description),
    });
    setMenuItemErrors(check.errors);
    if (!check.valid) return;
    if (menuItems.some((m) => m.name === check.values.name)) {
      setMenuItemErrors({ name: "این محصول قبلاً به منو اضافه شده است" });
      return;
    }
    if (menuItems.length >= menuItemLimit) {
      setError(`در پلن ${PLAN_LIMITS[plan].label} فقط می‌توانید حداکثر ${menuItemLimit.toLocaleString("fa-IR")} آیتم منو برای هر فودتراک اضافه کنید. برای افزودن آیتم بیشتر، پلن خود را ارتقا دهید.`);
      return;
    }
    setError("");
    setMenuItems((prev) => [
      ...prev,
      { ...newMenuItem, name: check.values.name, description: check.values.description, price: String(check.values.price) },
    ]);
    setNewMenuItem({ name: "", description: "", price: "", category: newMenuItem.category, image: "" });
    setMenuItemErrors({});
  };

  const removeMenuItemDraft = (idx: number) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMenuCategory = () => {
    const check = validateMenuCategoryName(newCategoryName);
    if (check.error !== null) {
      setMenuCategoryError(check.error);
      return;
    }
    const name = check.value;
    if (menuCategories.includes(name)) {
      setMenuCategoryError("این دسته قبلاً اضافه شده است");
      return;
    }
    setMenuCategoryError("");
    setMenuCategories((prev) => [...prev, name]);
    setNewCategoryName("");
    if (!newMenuItem.category) {
      setNewMenuItem((prev) => ({ ...prev, category: name }));
    }
  };

  const removeMenuCategory = async (name: string) => {
    const ok = await confirmDialog({
      title: "حذف دسته منو",
      description: `دسته «${name}» حذف شود؟ آیتم‌های فعلی فقط دسته‌بندی‌شان پاک می‌شود.`,
      confirmText: "حذف دسته",
      variant: "danger",
    });
    if (!ok) return;
    setMenuCategories((prev) => prev.filter((c) => c !== name));
    setMenuItems((prev) => prev.map((item) => (item.category === name ? { ...item, category: "" } : item)));
    if (newMenuItem.category === name) {
      setNewMenuItem((prev) => ({ ...prev, category: "" }));
    }
  };

  const addPhoto = (dataUrl: string) => {
    if (!dataUrl) return;
    if (photos.length >= photoLimit) {
      setError(`در پلن ${PLAN_LIMITS[plan].label} فقط می‌توانید حداکثر ${photoLimit.toLocaleString("fa-IR")} عکس برای گالری هر فودتراک انتخاب کنید. برای آپلود عکس بیشتر، پلن خود را ارتقا دهید.`);
      return;
    }
    setError("");
    setPhotos((prev) => [...prev, dataUrl]);
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  /** Validates the current step's fields, stores per-field errors and returns the first message. */
  const validateStep = (): string | null => {
    if (step === 1) {
      const check = runValidators({
        name: validateBusinessName(form.name),
        categoryIds: validateIdList(form.categoryIds, { min: 1, max: MAX_BUSINESS_CATEGORIES, label: "دسته‌بندی غذایی" }),
        description: validateDescription(form.description),
      });
      setFieldErrors((prev) => ({ ...prev, ...check.errors, name: check.errors.name, categoryIds: check.errors.categoryIds, description: check.errors.description }));
      return check.firstError ?? null;
    }
    if (step === 2) {
      const check = runValidators({
        city: validateCity(form.city),
        locationText: validateAddress(form.locationText),
        locationLink: validateMapLink(form.locationLink, false),
        phone: validateBusinessPhone(form.phone, false),
        instagram: validateInstagram(form.instagram, false),
      });
      setFieldErrors((prev) => ({
        ...prev,
        city: check.errors.city,
        locationText: check.errors.locationText,
        locationLink: check.errors.locationLink,
        phone: check.errors.phone,
        instagram: check.errors.instagram,
      }));
      return check.firstError ?? null;
    }
    if (step === 3) {
      const check = validateHours(hours);
      setFieldErrors((prev) => ({ ...prev, hours: check.error ?? undefined }));
      if (check.error !== null) return check.error;
      if (check.value.every((h) => h.isClosed)) {
        const msg = "حداقل یک روز هفته باید باز باشد";
        setFieldErrors((prev) => ({ ...prev, hours: msg }));
        return msg;
      }
    }
    if (step === TOTAL_STEPS) {
      if (!verificationPhoto && !isAdmin) return "برای احراز هویت، یک عکس از فودتراک خود بارگذاری کنید";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo(0, 0);
      return;
    }

    setLoading(true);

    try {
      const normalized = runValidators({
        name: validateBusinessName(form.name),
        description: validateDescription(form.description),
        locationText: validateAddress(form.locationText),
        locationLink: validateMapLink(form.locationLink, false),
        phone: validateBusinessPhone(form.phone, false),
        instagram: validateInstagram(form.instagram, false),
      });
      if (!normalized.valid) {
        setError(normalized.firstError || "لطفاً خطاهای فرم را برطرف کنید");
        setStep(1);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...normalized.values,
          hours,
          menuItems,
          menuCategories,
          photos,
          verificationPhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors && typeof data.errors === "object") {
          setFieldErrors((prev) => ({ ...prev, ...data.errors }));
          // Jump back to the step that owns the first failing field.
          const key = Object.keys(data.errors)[0];
          if (["name", "description", "categoryIds"].includes(key)) setStep(1);
          else if (["city", "locationText", "locationLink", "phone", "instagram"].includes(key)) setStep(2);
          else if (key === "hours") setStep(3);
          else if (["menuItems", "menuCategories"].includes(key)) setStep(4);
          else if (key === "photos") setStep(5);
          window.scrollTo(0, 0);
        }
        setError(data.error || "خطایی رخ داد");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/owner");
      }, 2000);
    } catch {
      setError("خطای سرور");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <Store className="w-14 h-14 text-orange-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">حساب شما مالک فودتراک نیست</h1>
            <p className="text-gray-500 text-sm mb-6">
              برای ثبت فودتراک، باید حساب شما با نقش «مالک فودتراک» ثبت شده باشد.
            </p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-medium"
            >
              تغییر نقش در پروفایل
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md animate-fade-in">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">فودتراک شما ثبت شد!</h1>
            <p className="text-gray-500 text-sm">
              درخواست شما برای بررسی ارسال شد. در حال انتقال به داشبورد...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <BackButton fallback="/dashboard/owner" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors" />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">ثبت فودتراک جدید</h1>
          <p className="text-sm text-gray-500">اطلاعات کامل رو وارد کن؛ بعد از تایید مستقیم روی صفحه‌ات دیده می‌شه.</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === s ? "w-8 bg-primary" : s < step ? "w-2 bg-orange-300" : "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            مرحله {step.toLocaleString("fa-IR")} از {TOTAL_STEPS.toLocaleString("fa-IR")} — {STEP_LABELS[step - 1]}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <Info className="w-5 h-5" />
                <h2>اطلاعات پایه</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">نام فودتراک *</label>
                <input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => checkField("name")}
                  maxLength={60}
                  aria-invalid={!!fieldErrors.name}
                  className={inputClass(fieldErrors.name)}
                  placeholder="مثلا: فودتراک برگر تهران"
                />
                <FieldError error={fieldErrors.name} />
                {!fieldErrors.name && <FieldHint>فقط حروف فارسی و عدد، ۲ تا ۶۰ کاراکتر</FieldHint>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Tags className="w-4 h-4 text-primary" />
                  دسته‌بندی‌های غذایی * <span className="text-xs text-gray-400 font-normal">(حداکثر {MAX_BUSINESS_CATEGORIES} مورد، مثلا پیتزا و برگر)</span>
                </label>
                {categoriesLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-9 w-20 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : categories.length ? (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const active = form.categoryIds.includes(cat.id);
                      const disabled = !active && form.categoryIds.length >= MAX_BUSINESS_CATEGORIES;
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
                  <p className="text-xs text-gray-400">هنوز دسته‌بندی‌ای توسط ادمین ثبت نشده است.</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {form.categoryIds.length} از {MAX_BUSINESS_CATEGORIES} دسته انتخاب شده — دسته‌بندی‌ها توسط تیم ون جا مدیریت می‌شوند؛ اگر دسته‌ای که لازم داری وجود نداره، از بخش تماس با ما به ما اطلاع بده.
                </p>
                <FieldError error={fieldErrors.categoryIds} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">توضیحات</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  onBlur={() => checkField("description")}
                  rows={4}
                  maxLength={1000}
                  aria-invalid={!!fieldErrors.description}
                  className={inputClass(fieldErrors.description, "resize-none")}
                  placeholder="فودتراک خود را معرفی کنید..."
                />
                <FieldError error={fieldErrors.description} />
                <div className="flex items-center justify-between">
                  {!fieldErrors.description ? <FieldHint>فقط به زبان فارسی</FieldHint> : <span />}
                  <span className="text-[11px] text-gray-400 mt-1.5">{form.description.length.toLocaleString("fa-IR")} / {(1000).toLocaleString("fa-IR")}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <MapPin className="w-5 h-5" />
                <h2>موقعیت و تماس</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">شهر *</label>
                <select
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  aria-invalid={!!fieldErrors.city}
                  className={inputClass(fieldErrors.city)}
                >
                  {IRAN_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <FieldError error={fieldErrors.city} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">آدرس دقیق امروزی *</label>
                <input
                  value={form.locationText}
                  onChange={(e) => handleChange("locationText", e.target.value)}
                  onBlur={() => checkField("locationText")}
                  maxLength={300}
                  aria-invalid={!!fieldErrors.locationText}
                  className={inputClass(fieldErrors.locationText)}
                  placeholder="مثلا: تقاطع ولیعصر و انقلاب، ضلع شمال غربی"
                />
                <FieldError error={fieldErrors.locationText} />
                {!fieldErrors.locationText && <FieldHint>به فارسی، حداقل ۵ کاراکتر</FieldHint>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">لینک گوگل مپ</label>
                <input
                  type="url"
                  inputMode="url"
                  value={form.locationLink}
                  onChange={(e) => handleChange("locationLink", e.target.value.replace(/\s+/g, ""))}
                  onBlur={() => checkField("locationLink")}
                  maxLength={1000}
                  aria-invalid={!!fieldErrors.locationLink}
                  className={inputClass(fieldErrors.locationLink, "text-left")}
                  placeholder="https://maps.app.goo.gl/..."
                  dir="ltr"
                />
                <FieldError error={fieldErrors.locationLink} />
                {!fieldErrors.locationLink && <FieldHint>اختیاری — لینک اشتراک‌گذاری از گوگل‌مپ، نشان یا بلد</FieldHint>}
              </div>
              {/* اطلاع‌رسانی (شماره تماس + اینستاگرام) — ویژه پلن حرفه‌ای */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  اطلاع‌رسانی به مشتری‌ها
                  {!isAdmin && plan !== "pro" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                      <Sparkles className="w-3 h-3" /> ویژه پلن حرفه‌ای
                    </span>
                  )}
                </label>
                {isAdmin || plan === "pro" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">تلفن تماس</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        onBlur={() => checkField("phone")}
                        maxLength={14}
                        aria-invalid={!!fieldErrors.phone}
                        className={inputClass(fieldErrors.phone, "text-left")}
                        placeholder="09123456789"
                      />
                      <FieldError error={fieldErrors.phone} />
                      {!fieldErrors.phone && <FieldHint>موبایل یا تلفن ثابت با کد شهر</FieldHint>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">آیدی اینستاگرام</label>
                      <input
                        value={form.instagram}
                        onChange={(e) => handleChange("instagram", e.target.value)}
                        onBlur={() => checkField("instagram")}
                        placeholder="username"
                        dir="ltr"
                        maxLength={30}
                        autoCapitalize="none"
                        aria-invalid={!!fieldErrors.instagram}
                        className={inputClass(fieldErrors.instagram, "text-left")}
                      />
                      <FieldError error={fieldErrors.instagram} />
                      {!fieldErrors.instagram && <FieldHint>بدون @ — فقط حروف انگلیسی، عدد، نقطه و زیرخط</FieldHint>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-gray-500 leading-6">
                      نمایش شماره تماس و آیدی اینستاگرام روی صفحه فودتراک، مخصوص پلن حرفه‌ای است.
                    </p>
                    <Link href="/pricing" className="text-xs font-bold text-primary hover:underline whitespace-nowrap">
                      مشاهده پلن‌ها ←
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <Clock className="w-5 h-5" />
                <h2>ساعات کاری</h2>
              </div>
              <div className="space-y-3">
                {hours.map((hour, idx) => (
                  <div key={hour.day} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="w-24 font-medium text-sm text-gray-800">{getPersianDayName(hour.day)}</span>
                      <label className="flex items-center gap-2 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={hour.isClosed}
                          onChange={(e) => {
                            const next = [...hours];
                            next[idx] = { ...hour, isClosed: e.target.checked };
                            setHours(next);
                            clearFieldError("hours");
                          }}
                          className="accent-orange-500"
                        />
                        تعطیل
                      </label>
                    </div>
                    {!hour.isClosed && (
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="time"
                          value={hour.openTime}
                          onChange={(e) => {
                            const next = [...hours];
                            next[idx] = { ...hour, openTime: e.target.value };
                            setHours(next);
                            clearFieldError("hours");
                          }}
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        />
                        <span className="text-sm text-gray-400">تا</span>
                        <input
                          type="time"
                          value={hour.closeTime}
                          onChange={(e) => {
                            const next = [...hours];
                            next[idx] = { ...hour, closeTime: e.target.value };
                            setHours(next);
                            clearFieldError("hours");
                          }}
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <FieldError error={fieldErrors.hours} />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                  <h2>منو</h2>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {menuItems.length.toLocaleString("fa-IR")} / {Number.isFinite(menuItemLimit) ? menuItemLimit.toLocaleString("fa-IR") : "∞"}
                </span>
              </div>
              <p className="text-xs text-gray-400 -mt-3">
                آیتم‌های منو رو اضافه کن؛ اختیاریه ولی صفحه‌ات با منوی کامل خیلی بهتر دیده می‌شه. بعداً هم می‌تونی از داشبورد اضافه/ویرایش کنی.
              </p>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">دسته‌بندی‌های منو</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      placeholder="مثلا: پیش‌غذا، نوشیدنی، دسر"
                      value={newCategoryName}
                      maxLength={40}
                      onChange={(e) => { setNewCategoryName(e.target.value); if (menuCategoryError) setMenuCategoryError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMenuCategory(); } }}
                      aria-invalid={!!menuCategoryError}
                      className={inputClass(menuCategoryError, "bg-white py-2.5")}
                    />
                    <FieldError error={menuCategoryError} />
                  </div>
                  <button
                    type="button"
                    onClick={addMenuCategory}
                    className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    افزودن دسته
                  </button>
                </div>
                {menuCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {menuCategories.map((cat) => (
                      <div key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700">
                        <span>{cat}</span>
                        <button onClick={() => removeMenuCategory(cat)} type="button" className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">هنوز دسته‌ای برای منو نساخته‌اید.</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <ImageUpload label="تصویر آیتم منو" value={newMenuItem.image} onChange={(v) => setNewMenuItem((p) => ({ ...p, image: v }))} aspect="wide" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      placeholder="نام محصول (فارسی)"
                      value={newMenuItem.name}
                      maxLength={80}
                      onChange={(e) => { setNewMenuItem((p) => ({ ...p, name: e.target.value })); if (menuItemErrors.name) setMenuItemErrors((p) => ({ ...p, name: undefined })); }}
                      aria-invalid={!!menuItemErrors.name}
                      className={inputClass(menuItemErrors.name, "bg-white py-2.5")}
                    />
                    <FieldError error={menuItemErrors.name} />
                  </div>
                  <div>
                    <input
                      placeholder="قیمت (تومان)"
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={newMenuItem.price}
                      maxLength={9}
                      onChange={(e) => { setNewMenuItem((p) => ({ ...p, price: digitsOnly(e.target.value) })); if (menuItemErrors.price) setMenuItemErrors((p) => ({ ...p, price: undefined })); }}
                      aria-invalid={!!menuItemErrors.price}
                      className={inputClass(menuItemErrors.price, "bg-white py-2.5 text-left")}
                    />
                    <FieldError error={menuItemErrors.price} />
                    {!menuItemErrors.price && newMenuItem.price && (
                      <FieldHint>{Number(newMenuItem.price).toLocaleString("fa-IR")} تومان</FieldHint>
                    )}
                  </div>
                  <select
                    value={newMenuItem.category}
                    onChange={(e) => setNewMenuItem((p) => ({ ...p, category: e.target.value }))}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="">بدون دسته‌بندی</option>
                    {menuCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div>
                    <input
                      placeholder="توضیحات کوتاه (اختیاری)"
                      value={newMenuItem.description}
                      maxLength={200}
                      onChange={(e) => { setNewMenuItem((p) => ({ ...p, description: e.target.value })); if (menuItemErrors.description) setMenuItemErrors((p) => ({ ...p, description: undefined })); }}
                      aria-invalid={!!menuItemErrors.description}
                      className={inputClass(menuItemErrors.description, "bg-white py-2.5")}
                    />
                    <FieldError error={menuItemErrors.description} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addMenuItemDraft}
                  disabled={menuItems.length >= menuItemLimit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  افزودن به منو
                </button>
                {menuItems.length >= menuItemLimit && (
                  <p className="text-xs text-orange-600">
                    شما به سقف {menuItemLimit.toLocaleString("fa-IR")} آیتم منوی پلن {PLAN_LIMITS[plan].label} رسیده‌اید. برای افزودن آیتم بیشتر، پلن خود را ارتقا دهید.
                  </p>
                )}
              </div>

              {menuItems.length > 0 && (
                <div className="space-y-2">
                  {menuItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                      {item.image && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          {item.name}
                          {item.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">{item.category}</span>
                          )}
                        </div>
                        {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                      </div>
                      <span className="text-sm font-bold text-primary whitespace-nowrap">{Number(item.price).toLocaleString("fa-IR")} ت</span>
                      <button type="button" onClick={() => removeMenuItemDraft(idx)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <ImageIcon className="w-5 h-5" />
                <h2>تصاویر و گالری</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ImageUpload label="لوگوی فودتراک" value={form.logo} onChange={(v) => handleChange("logo", v)} aspect="square" />
                <ImageUpload label="تصویر کاور (اصلی)" value={form.coverImage} onChange={(v) => handleChange("coverImage", v)} aspect="wide" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  <span>گالری تصاویر</span>
                  <span className="text-xs font-bold text-gray-400">
                    {photos.length.toLocaleString("fa-IR")} / {Number.isFinite(photoLimit) ? photoLimit.toLocaleString("fa-IR") : "∞"}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden h-28">
                      <img src={url} alt={`تصویر ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                  {photos.length < photoLimit && <ImageUpload value="" onChange={addPhoto} aspect="square" />}
                </div>
                {photos.length >= photoLimit && (
                  <p className="text-xs text-orange-600 mt-2">
                    شما به سقف {photoLimit.toLocaleString("fa-IR")} عکس پلن {PLAN_LIMITS[plan].label} رسیده‌اید. برای گالری بزرگ‌تر، پلن خود را ارتقا دهید.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-6 space-y-1">
                <p><strong>نکته:</strong> تصاویر با کیفیت باعث جذب مشتری بیشتر می‌شود. حجم فایل نباید بیشتر از ۴ مگابایت باشد.</p>
                <p><strong>بعد از ثبت:</strong> همیشه می‌توانید از داشبورد، منو، گالری و بقیه اطلاعات را ویرایش کنید.</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center gap-2 text-primary font-bold mb-2">
                <ShieldCheck className="w-5 h-5" />
                <h2>احراز هویت فودتراک</h2>
              </div>

              <p className="text-sm text-gray-600 leading-7 -mt-2">
                تقریباً تمومه! برای اینکه مطمئن بشیم فودتراک شما واقعی است و از ثبت آگهی‌های جعلی جلوگیری کنیم،
                یک عکس از <strong className="text-gray-900">خودِ فودتراک</strong> بگیر و همین‌جا بارگذاری کن.
              </p>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-xs text-emerald-800 leading-6">
                  <p className="font-bold text-sm mb-0.5 flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4" />
                    این عکس برای هیچ‌کس نمایش داده نمی‌شود
                  </p>
                  <p>
                    این تصویر روی صفحه فودتراک، در نتایج جست‌وجو یا هیچ بخش عمومی دیگری منتشر نمی‌شود.
                    فقط تیم ون جا آن را می‌بیند تا معتبر بودن کسب‌وکار شما را تأیید کند و درخواستتان را سریع‌تر بررسی کند.
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 transition-colors ${verificationPhoto ? "border-emerald-200 bg-emerald-50/40" : "border-gray-100 bg-gray-50"}`}>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary" />
                  عکس فودتراک {isAdmin ? <span className="text-xs text-gray-400 font-normal">(برای ادمین اختیاری)</span> : "*"}
                </label>
                <ImageUpload value={verificationPhoto} onChange={setVerificationPhoto} aspect="wide" />
                {verificationPhoto ? (
                  <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    عکس دریافت شد. فقط برای بررسی داخلی استفاده می‌شود.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    ترجیحاً عکسی که نمای کلی تراک، تابلو یا نام فودتراک در آن مشخص باشد.
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-700 leading-6 space-y-1">
                <p><strong>چه عکسی مناسب است؟</strong> یک عکس واضح از بیرون فودتراک؛ لازم نیست حرفه‌ای باشد، همان دوربین موبایل کافی است.</p>
                <p><strong>بعد از ثبت:</strong> درخواست شما در صف بررسی قرار می‌گیرد و پس از تأیید، صفحه فودتراک برای همه قابل مشاهده می‌شود.</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => { setError(""); setStep(step - 1); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                قبلی
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:from-orange-600 hover:to-pink-600 transition-all btn-glow disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === TOTAL_STEPS ? "ثبت نهایی فودتراک" : "مرحله بعد"}
                  {step < TOTAL_STEPS && <ArrowLeft className="w-4 h-4" />}
                  {step === TOTAL_STEPS && <Send className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
