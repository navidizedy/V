import Link from "next/link";
import { MessageCircle, Mail, Send } from "lucide-react";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Logo size={40} />
            <p className="text-sm text-gray-500 leading-7 mt-4 max-w-sm">
              «ون جا، جای ون» — پلتفرم تخصصی فودتراک‌های ایران. فودتراکت رو
              معرفی کن و مشتری‌ها همین‌جا پیدات می‌کنن.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://instagram.com/vanja.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://t.me/vanja_ir"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="mailto:info@vanja.ir"
                className="w-9 h-9 rounded-full bg-gray-50 hover:bg-orange-50 flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-sm">
              دسترسی سریع
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/businesses"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  جستجوی فودتراک‌ها
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  پلن‌ها و تعرفه‌ها
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  درباره ون جا
                </Link>
              </li>
              <li>
                <Link
                  href="/auth/register"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  ثبت فودتراک
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-sm">پشتیبانی</h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  سوالات متداول
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  تماس با ما
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  قوانین و مقررات
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                  حریم خصوصی
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} ون جا. تمام حقوق محفوظ است.
          </p>
          <p className="text-sm text-gray-400">
            ساخته‌شده با ❤️ برای فودتراک های ایران
          </p>
        </div>
      </div>
    </footer>
  );
}
