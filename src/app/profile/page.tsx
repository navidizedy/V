"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { User, Mail, Phone, Save, CheckCircle2, Heart, Store, Lock, AlertTriangle, Trash2 } from "lucide-react";
import { FieldError, FieldHint, inputClass } from "@/components/field-error";
import {
  emailCharsOnly,
  phoneCharsOnly,
  runValidators,
  validateEmail,
  validateExistingPassword,
  validateMobile,
  validateNewPassword,
  validatePersonName,
  type FieldErrors,
} from "@/lib/validators";
import Link from "next/link";
import { ImageUpload } from "@/components/image-upload";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { queuePendingToast } from "@/components/pending-toast-bridge";
import { BackButton } from "@/components/back-button";

export default function PublicProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<"name" | "email" | "phone">>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors<"currentPassword" | "newPassword">>({});

  const validateProfileForm = () =>
    runValidators({
      name: validatePersonName(name),
      email: validateEmail(email),
      phone: validateMobile(phone, true),
    });

  const blurProfileField = (field: "name" | "email" | "phone") => {
    const check = validateProfileForm();
    setFieldErrors((p) => ({ ...p, [field]: check.errors[field] }));
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && (session?.user?.role === "admin" || session?.user?.role === "founder")) {
      // Founders/admins manage their credentials via environment variables and
      // don't have a profile section — send them back to their dashboard.
      router.push("/dashboard/admin");
      return;
    }
    if (session) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          setProfile(data);
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setAvatar(data.avatar || "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session, status, router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const check = validateProfileForm();
    setFieldErrors(check.errors);
    if (!check.valid) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...check.values, avatar }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      if (data.errors && typeof data.errors === "object") setFieldErrors(data.errors);
      setError(data.error || "خطا در ذخیره اطلاعات");
      return;
    }
    setFieldErrors({});
    setPhone(data.phone || check.values.phone);
    setEmail(data.email || check.values.email);

    setProfile(data);
    await update({ name: data.name });
    // Clear avatar cache to update navbar and sidebar
    if (session?.user?.id) {
      const cacheKey = `avatar_${session.user.id}`;
      sessionStorage.setItem(cacheKey, data.avatar || 'null');
    }
    setMessage("پروفایل با موفقیت ذخیره شد");
    setTimeout(() => setMessage(""), 2500);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const check = runValidators({
      currentPassword: validateExistingPassword(currentPassword, "رمز عبور فعلی"),
      newPassword: validateNewPassword(newPassword, true, "رمز عبور جدید"),
    });
    if (check.valid && currentPassword === newPassword) {
      check.errors.newPassword = "رمز عبور جدید باید با رمز فعلی متفاوت باشد";
      check.valid = false;
    }
    setPasswordErrors(check.errors);
    if (!check.valid) return;
    setPasswordSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "password", currentPassword, newPassword }),
    });
    const data = await res.json();
    setPasswordSaving(false);
    if (!res.ok) {
      if (data.errors && typeof data.errors === "object") setPasswordErrors(data.errors);
      setError(data.error || "خطا در تغییر رمز عبور");
      return;
    }
    setPasswordErrors({});
    setCurrentPassword("");
    setNewPassword("");
    setMessage("رمز عبور با موفقیت تغییر کرد");
    setTimeout(() => setMessage(""), 2500);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("رمز عبور خود را وارد کنید");
      return;
    }
    const ok = await confirmDialog({
      title: "حذف حساب کاربری",
      description: "آیا مطمئن هستید که می‌خواهید حساب کاربری خود را برای همیشه حذف کنید؟ این عمل قابل بازگشت نیست.",
      confirmText: "حذف حساب",
      variant: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || "خطا در حذف حساب");
        setDeleting(false);
        return;
      }
      // signOut() below triggers a full page redirect/reload, so any in-memory
      // toast would be lost instantly — queue it to be shown after the reload.
      queuePendingToast("حساب کاربری شما با موفقیت حذف شد", "success");
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("خطای سرور. دوباره تلاش کنید.");
      setDeleting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const roleLabel = profile?.role === "admin" ? "بنیان‌گذار" : profile?.role === "owner" ? "مالک فودتراک" : "کاربر";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <BackButton fallback="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h1 className="text-xl font-extrabold text-gray-900 mb-1">{name || session.user.name}</h1>
              <p className="text-sm text-gray-500 truncate mb-3">{session.user.email}</p>
              <span className="inline-flex px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                {roleLabel}
              </span>
              <div className="mt-6 grid grid-cols-1 gap-2">
                <Link href="/favorites" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                  <Heart className="w-4 h-4" /> علاقه‌مندی‌ها
                </Link>
                <Link href="/businesses" className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                  <Store className="w-4 h-4" /> جستجوی فودتراک‌ها
                </Link>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6">ویرایش پروفایل</h2>

              {message && (
                <div className="mb-5 p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {message}
                </div>
              )}
              {error && <div className="mb-5 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}

              <form onSubmit={saveProfile} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">نام و نام خانوادگی</label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                    id="profile-name"
                    type="text"
                    value={name}
                    maxLength={50}
                    autoComplete="name"
                    onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }}
                    onBlur={() => blurProfileField("name")}
                    aria-invalid={!!fieldErrors.name}
                    className={inputClass(fieldErrors.name, "pr-10")}
                    placeholder="مثلاً: علی محمدی"
                  />
                  </div>
                <FieldError error={fieldErrors.name} />
                {!fieldErrors.name && <FieldHint>فقط حروف فارسی؛ بدون عدد یا حروف انگلیسی</FieldHint>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">ایمیل</label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                    id="profile-email"
                    type="email"
                    inputMode="email"
                    dir="ltr"
                    value={email}
                    maxLength={254}
                    autoComplete="email"
                    onChange={(e) => { setEmail(emailCharsOnly(e.target.value)); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    onBlur={() => blurProfileField("email")}
                    aria-invalid={!!fieldErrors.email}
                    className={inputClass(fieldErrors.email, "pr-10 text-left")}
                    placeholder="example@email.com"
                  />
                  </div>
                <FieldError error={fieldErrors.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">شماره موبایل</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                    id="profile-phone"
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    value={phone}
                    maxLength={14}
                    autoComplete="tel"
                    onChange={(e) => { setPhone(phoneCharsOnly(e.target.value)); if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined })); }}
                    onBlur={() => blurProfileField("phone")}
                    aria-invalid={!!fieldErrors.phone}
                    className={inputClass(fieldErrors.phone, "pr-10 text-left")}
                    placeholder="09123456789"
                  />
                  </div>
                <FieldError error={fieldErrors.phone} />
                {!fieldErrors.phone && <FieldHint>۱۱ رقم و با ۰۹ شروع شود</FieldHint>}
                </div>
                <button disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 btn-glow">
                  <Save className="w-4 h-4" />
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 mt-6">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                تغییر رمز عبور
              </h2>
              <form onSubmit={changePassword} className="space-y-4" noValidate>
                <div>
                <input
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={currentPassword}
                  maxLength={72}
                  onChange={(e) => { setCurrentPassword(e.target.value); if (passwordErrors.currentPassword) setPasswordErrors((p) => ({ ...p, currentPassword: undefined })); }}
                  placeholder="رمز عبور فعلی"
                  aria-invalid={!!passwordErrors.currentPassword}
                  className={inputClass(passwordErrors.currentPassword, "text-left")}
                />
                <FieldError error={passwordErrors.currentPassword} />
              </div>
                <div>
                <input
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  value={newPassword}
                  maxLength={72}
                  onChange={(e) => { setNewPassword(e.target.value); if (passwordErrors.newPassword) setPasswordErrors((p) => ({ ...p, newPassword: undefined })); }}
                  onBlur={() => setPasswordErrors((p) => ({ ...p, newPassword: newPassword ? validateNewPassword(newPassword, true, "رمز عبور جدید").error ?? undefined : undefined }))}
                  placeholder="رمز عبور جدید"
                  aria-invalid={!!passwordErrors.newPassword}
                  className={inputClass(passwordErrors.newPassword, "text-left")}
                />
                <FieldError error={passwordErrors.newPassword} />
                {!passwordErrors.newPassword && <FieldHint>حداقل ۸ کاراکتر، شامل حداقل یک حرف انگلیسی و یک عدد</FieldHint>}
              </div>
                <button disabled={passwordSaving} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 disabled:opacity-50">
                  <Lock className="w-4 h-4" />
                  {passwordSaving ? "در حال تغییر..." : "تغییر رمز"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-3xl border border-red-100 shadow-sm p-6 sm:p-8 mt-6">
              <h2 className="text-xl font-extrabold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                حذف حساب کاربری
              </h2>
              <p className="text-sm text-gray-500 mb-6 leading-7">
                با حذف حساب کاربری، تمام اطلاعات شما شامل نظرات و علاقه‌مندی‌ها برای همیشه پاک می‌شود. این عمل غیرقابل بازگشت است.
              </p>

              {!showDeleteForm ? (
                <button
                  onClick={() => setShowDeleteForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف حساب کاربری
                </button>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  {deleteError && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{deleteError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">برای تایید، رمز عبور خود را وارد کنید</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="رمز عبور"
                      className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={deleting}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? "در حال حذف..." : "حذف قطعی حساب"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDeleteForm(false); setDeletePassword(""); setDeleteError(""); }}
                      className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
