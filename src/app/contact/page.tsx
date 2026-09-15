import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Mail, Send, MapPin, Phone, Clock } from "lucide-react";

import { BackButton } from "@/components/back-button";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">تماس با ون جا</h1>
          <p className="text-gray-500">
            سوالی دارید یا می‌خواهید همکاری کنید؟ از راه‌های زیر با تیم ون جا در تماس باشید.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-gray-400">ایمیل</div>
              <a href="mailto:info@vanja.ir" className="font-medium text-gray-900 hover:text-primary transition-colors" dir="ltr">
                info@vanja.ir
              </a>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-gray-400">تلفن پشتیبانی</div>
              <a href="tel:+982191234567" className="font-medium text-gray-900 hover:text-primary transition-colors" dir="ltr">
                021-91234567
              </a>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-gray-400">تلگرام</div>
              <div className="font-medium text-gray-900" dir="ltr">@vanja_support</div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-gray-400">دفتر مرکزی</div>
              <div className="font-medium text-gray-900">تهران، ایران</div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4 sm:col-span-2">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-gray-400">ساعات پاسخگویی</div>
              <div className="font-medium text-gray-900">همه روزه، ساعت ۹ تا ۲۱</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
