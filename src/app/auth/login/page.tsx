"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { FieldError, inputClass } from "@/components/field-error";
import { emailCharsOnly, runValidators, validateEmail, validateExistingPassword, type FieldErrors } from "@/lib/validators";
import { BackButton } from "@/components/back-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check the format locally first so a typo never even reaches the auth endpoint.
    const check = runValidators({
      email: validateEmail(email),
      password: validateExistingPassword(password),
    });
    setErrors(check.errors);
    if (!check.valid) return;

    setLoading(true);
    const result = await signIn("credentials", {
      email: check.values.email,
      password: check.values.password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    });

    if (result?.error) {
      setError("ایمیل یا رمز عبور اشتباه است");
      setLoading(false);
    } else {
      const profile = await fetch("/api/profile").then((r) => r.json()).catch(() => null);
      if (profile?.role === "admin" || profile?.role === "founder") router.push("/dashboard/admin");
      else if (profile?.role === "owner") router.push("/dashboard/owner");
      else router.push("/");
      router.refresh();
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ورود به حساب</h1>
            <p className="text-sm text-gray-500">به ون جا خوش آمدید</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ایمیل</label>
              <input
                type="email"
                inputMode="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(emailCharsOnly(e.target.value));
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email).error ?? undefined }))}
                maxLength={254}
                aria-invalid={!!errors.email}
                className={inputClass(errors.email, "text-left")}
                placeholder="example@email.com"
              />
              <FieldError error={errors.email} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">رمز عبور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  maxLength={72}
                  aria-invalid={!!errors.password}
                  className={inputClass(errors.password, "pl-11 text-left")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError error={errors.password} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-orange-500/30 accent-orange-500"
              />
              <span className="text-sm text-gray-600">مرا به خاطر بسپار</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:from-orange-600 hover:to-pink-600 transition-all shadow-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "در حال ورود..." : "ورود"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              حساب کاربری ندارید؟{" "}
              <Link href="/auth/register" className="text-primary font-medium hover:underline">
                ثبت‌نام کنید
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
