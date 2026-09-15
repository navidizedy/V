import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LogoMark } from "@/components/logo";
import { Home, Search } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6 opacity-60">
            <LogoMark size={72} />
          </div>
          <h1 className="text-6xl font-extrabold gradient-text mb-3">۴۰۴</h1>
          <h2 className="text-xl font-bold text-gray-900 mb-2">این صفحه پیدا نشد!</h2>
          <p className="text-gray-500 mb-8 leading-7">
            انگار این فودتراک از این‌جا رد شده و رفته. صفحه‌ای که دنبالش بودید وجود ندارد یا جابه‌جا شده است.
          </p>
          <div className="mb-8 md:hidden">
            <BackButton fallback="/" label="بازگشت" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold"
            >
              <Home className="w-4 h-4" />
              بازگشت به خانه
            </Link>
            <Link
              href="/businesses"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50"
            >
              <Search className="w-4 h-4" />
              جستجوی فودتراک‌ها
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
