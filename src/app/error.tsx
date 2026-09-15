"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          خطایی رخ داده است
        </h1>
        <p className="text-gray-600 mb-8">
          متأسفانه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
        </p>
        <div className="mb-8 md:hidden">
          <BackButton fallback="/" label="بازگشت" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
