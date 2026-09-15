"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast-provider";
import { FieldError, FieldHint, inputClass } from "@/components/field-error";
import {
  emailCharsOnly,
  phoneCharsOnly,
  runValidators,
  validateEmail,
  validateMobile,
  validateNewPassword,
  validatePersonName,
  type FieldErrors,
} from "@/lib/validators";
import { BackButton } from "@/components/back-button";

type Field = "name" | "email" | "phone" | "password";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [asOwner, setAsOwner] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

  const validators = {
    name: () => validatePersonName(name),
    email: () => validateEmail(email),
    phone: () => validateMobile(phone, true),
    password: () => validateNewPassword(password),
  };

  /** Validate one field (used on blur and while typing after the first blur). */
  const checkField = (field: Field, nextValue?: string) => {
    const res =
      field === "name" ? validatePersonName(nextValue ?? name)
      : field === "email" ? validateEmail(nextValue ?? email)
      : field === "phone" ? validateMobile(nextValue ?? phone, true)
      : validateNewPassword(nextValue ?? password);
    setErrors((prev) => ({ ...prev, [field]: res.error ?? undefined }));
    return !res.error;
  };

  const handleBlur = (field: Field) => {
    setTouched((p) => ({ ...p, [field]: true }));
    checkField(field);
  };

  const handleChange = (field: Field, raw: string) => {
    const value = field === "phone" ? phoneCharsOnly(raw) : field === "email" ? emailCharsOnly(raw) : raw;
    if (field === "name") setName(value);
    if (field === "email") setEmail(value);
    if (field === "phone") setPhone(value);
    if (field === "password") setPassword(value);
    if (touched[field]) checkField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = runValidators({
      name: validators.name(),
      email: validators.email(),
      phone: validators.phone(),
      password: validators.password(),
    });
    setTouched({ name: true, email: true, phone: true, password: true });
    setErrors(result.errors);
    if (!result.valid) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result.values, role: asOwner ? "owner" : "user" }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors && typeof data.errors === "object") setErrors(data.errors);
        setError(data.error || "خطایی رخ داد");
        setLoading(false);
        return;
      }

      toast.success("ثبت‌نام با موفقیت انجام شد! اکنون وارد شوید.");
      router.push("/auth/login");
    } catch {
      setError("خطای سرور");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <BackButton fallback="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex justify-center mb-6">
              <Logo size={44} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ثبت‌نام</h1>
            <p className="text-sm text-gray-500">حساب کاربری جدید در ون جا بسازید</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                نام و نام خانوادگی <span className="text-red-500" aria-hidden>*</span>
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                autoComplete="name"
                maxLength={50}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "register-name-error" : undefined}
                className={inputClass(errors.name)}
                placeholder="مثلاً: علی محمدی"
              />
              <FieldError id="register-name-error" error={errors.name} />
              {!errors.name && <FieldHint>فقط حروف فارسی؛ بدون عدد یا حروف انگلیسی</FieldHint>}
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                ایمیل <span className="text-red-500" aria-hidden>*</span>
              </label>
              <input
                id="register-email"
                type="email"
                inputMode="email"
                dir="ltr"
                value={email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                autoComplete="email"
                maxLength={254}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                className={inputClass(errors.email, "text-left")}
                placeholder="example@email.com"
              />
              <FieldError id="register-email-error" error={errors.email} />
            </div>

            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                شماره موبایل <span className="text-red-500" aria-hidden>*</span>
              </label>
              <input
                id="register-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                maxLength={14}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "register-phone-error" : undefined}
                className={inputClass(errors.phone, "text-left")}
                placeholder="09123456789"
              />
              <FieldError id="register-phone-error" error={errors.phone} />
              {!errors.phone && <FieldHint>۱۱ رقم و با ۰۹ شروع شود</FieldHint>}
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                رمز عبور <span className="text-red-500" aria-hidden>*</span>
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  autoComplete="new-password"
                  maxLength={72}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "register-password-error" : undefined}
                  className={inputClass(errors.password, "pl-11 text-left")}
                  placeholder="حداقل ۸ کاراکتر شامل حرف و عدد"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError id="register-password-error" error={errors.password} />
              {!errors.password && <FieldHint>حداقل ۸ کاراکتر، شامل حداقل یک حرف انگلیسی و یک عدد</FieldHint>}
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-50 border border-orange-100 cursor-pointer">
              <input
                type="checkbox"
                checked={asOwner}
                onChange={(e) => setAsOwner(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-orange-900 leading-6">
                می‌خواهم به‌عنوان <strong>مالک فودتراک</strong> ثبت‌نام کنم تا بتوانم فودتراک خود را ثبت کنم.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:from-orange-600 hover:to-pink-600 transition-all shadow-sm disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              قبلاً ثبت‌نام کرده‌اید؟{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                وارد شوید
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-3.5 h-3.5" />
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
