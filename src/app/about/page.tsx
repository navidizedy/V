import { Navbar } from "@/components/navbar";
import { BackButton } from "@/components/back-button";
import { Footer } from "@/components/footer";
import { LogoMark } from "@/components/logo";
import { Target, Heart, Users, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "آشنایی با ون جا، پلتفرم فودتراک‌ها ایران و داستان شکل‌گیری آن.",
};

const values = [
  {
    icon: Target,
    title: "ماموریت ما",
    desc: "کمک به فودتراک‌ها برای دیده‌شدن، بدون نیاز به ابزارهای پیچیده یا تبلیغات گران.",
  },
  {
    icon: Heart,
    title: "ارزش‌های ما",
    desc: "سادگی، شفافیت و احترام به وقت کاربران و صاحبان فودتراک، اساس طراحی ون جا است.",
  },
  {
    icon: Users,
    title: "جامعه ما",
    desc: "صدها فودتراک همین حالا عضو خانواده ون جا هستند.",
  },
];


export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <div className="flex justify-center mb-6">
            <LogoMark size={72} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            داستان <span className="gradient-text">ون جا</span>
          </h1>
          <p className="text-gray-500 leading-8 max-w-2xl mx-auto">
            «ون جا» از ترکیب دو کلمه‌ی «ون» و «جا» ساخته شده؛ یعنی «جای ون».
            ایده ساده بود: فودتراک‌ها هر روز جای متفاوتی هستند و مشتری‌ها
            معمولاً نمی‌دانند امروز کجا باید دنبالشان بگردند. ون جا این مشکل را
            حل می‌کند — یک‌جا، همه‌چیز درباره‌ی فودتراک مورد علاقه‌تان: موقعیت
            امروز، ساعت کاری، منو و عکس‌ها.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {values.map((v) => (
            <div
              key={v.title}
              className="p-7 rounded-2xl bg-white border border-gray-100 shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center mb-4">
                <v.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-7">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-12">
          <div>
            <span className="text-xs font-bold text-primary tracking-wide">
              چرا ون جا؟
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 mt-2 mb-4">
              ساخته‌شده برای فرهنگ و نیاز ایرانی
            </h2>
            <p className="text-gray-500 leading-7 mb-4">
              فودتراک‌ها در ایران معمولاً از طریق استوری اینستاگرام محل خودشان
              را اعلام می‌کنند، که هم برای صاحب فودتراک وقت‌گیر است و هم برای
              مشتری قابل پیگیری نیست. ون جا یک مکان ثابت برای این اطلاعات فراهم
              می‌کند؛ بدون پیچیدگی نقشه‌های آنلاین.
            </p>
            <p className="text-gray-500 leading-7">
              تمام محتوای ون جا به زبان فارسی و متناسب با فرهنگ فودتراک ایرانی
              طراحی شده است.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-orange-50 text-center">
              <MapPin className="w-7 h-7 text-primary mx-auto mb-2" />
              <div className="text-xl font-extrabold text-gray-900">
                بدون نقشه
              </div>
              <div className="text-xs text-gray-500 mt-1">
                فقط آدرس و لینک گوگل‌مپ
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-pink-50 text-center">
              <Sparkles className="w-7 h-7 text-pink-500 mx-auto mb-2" />
              <div className="text-xl font-extrabold text-gray-900">
                سریع و ساده
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ثبت در کمتر از ۵ دقیقه
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
