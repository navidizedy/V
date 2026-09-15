"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ImageUpload } from "@/components/image-upload";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { queuePendingToast } from "@/components/pending-toast-bridge";
import { User, Mail, Phone, Save, CheckCircle2, Lock, AlertTriangle, Trash2 } from "lucide-react";
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

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const confirmDialog = useConfirm();
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
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && session?.user?.role === "user") {
      router.push("/profile");
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
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setAvatar(data.avatar || "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    await update({ name: data.name });
    // Clear avatar cache to update navbar and sidebar
    if (session?.user?.id) {
      const cacheKey = `avatar_${session.user.id}`;
      sessionStorage.setItem(cacheKey, data.avatar || 'null');
    }
    setMessage("پروفایل با موفقیت ذخیره شد");
    setTimeout(() => setMessage(""), 3000);
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
    setTimeout(() => setMessage(""), 3000);
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
      description: "آیا مطمئن هستید که می‌خواهید حساب کاربری خود را برای همیشه حذف کنید؟ این عمل قابل بازگشت نیست و فودتراک‌های شما نیز حذف خواهند شد.",
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

  const roleLabel = session.user.role === "founder" ? "بنیان‌گذار" : session.user.role === "admin" ? "ادمین" : "مالک فودتراک";
  const isFounder = session.user.role === "founder";
  const isOwner = session.user.role === "owner";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
        <div className="max-w-3xl mx-auto">
          <BackButton fallback="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-6">پروفایل</h1>

          {(message || error) && (
            <div className={`mb-5 p-3 rounded-xl text-sm ${message ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 text-red-600"}`}>
              {message ? <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</span> : error}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              {isOwner && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-2xl font-extrabold shrink-0 overflow-hidden">
                  {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <User className="w-8 h-8" />}
                </div>
              )}
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{session.user.name}</h2>
                <p className="text-sm text-gray-500 mb-1.5">{session.user.email}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{roleLabel}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isOwner && <ImageUpload label="تصویر پروفایل" value={avatar} onChange={setAvatar} aspect="square" />}
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
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:from-orange-600 hover:to-pink-600 transition-all shadow-sm disabled:opacity-50 btn-glow">
                <Save className="w-4 h-4" />
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
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
              با حذف حساب کاربری، تمام اطلاعات شما شامل فودتراک‌ها، منوها، نظرات و علاقه‌مندی‌های مرتبط با این حساب برای همیشه پاک می‌شود. این عمل غیرقابل بازگشت است.
            </p>

            {isFounder ? (
              <p className="text-sm text-gray-400 font-bold">حساب بنیان‌گذار قابل حذف نیست.</p>
            ) : !showDeleteForm ? (
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
        </div>
      </main>
    </div>
  );
}
