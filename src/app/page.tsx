import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import {
  MapPin,
  ArrowLeft,
  Star,
  ShieldCheck,
  Navigation,
  Clock,
  Smartphone,
  Quote,
  ChefHat,
  Store,
  Menu as MenuIcon,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BusinessCard } from "@/components/business-card";
import { HeroSearch } from "@/components/home/hero-search";
import { StatsStrip } from "@/components/home/stats-strip";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { BackToTop } from "@/components/back-to-top";
import { IRAN_CITIES } from "@/lib/cities";
import { getCategoryIcon, DEFAULT_CATEGORY_COLOR } from "@/lib/category-icons";
import { faqs } from "@/lib/faqs";
import {
  getFeaturedBusinesses,
  getHomeCategories,
  getSiteStats,
} from "@/lib/home-data";

/**
 * Homepage — a React Server Component.
 *
 * All static sections (hero, features, testimonials, CTA, FAQ) are rendered on the
 * server and ship zero JavaScript. Data (featured trucks, categories, stats) is read
 * directly from the database with a 60s cache and streamed into the HTML, so the
 * first paint already contains real content instead of skeletons.
 *
 * Only three tiny islands hydrate on the client: the search form, the count-up
 * stats and the FAQ accordion.
 */
export const dynamic = "force-dynamic";

const HERO_TRUCK_IMAGE = "/hero-foodtruck.webp";

const features = [
  {
    icon: MapPin,
    title: "موقعیت لحظه‌ای",
    desc: "فودتراک‌ها هر روز جای متفاوتی‌ان. ون جا دقیقاً بهت می‌گه امروز کجان.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Clock,
    title: "الان بازه یا نه؟",
    desc: "دیگه دست‌خالی برنگرد. ببین فودتراک مورد علاقه‌ت همین الان بازه یا نه.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: MenuIcon,
    title: "منوی کامل با قیمت",
    desc: "قبل از رفتن، منو، قیمت‌ها و عکس غذاها رو ببین و انتخاب کن.",
    color: "from-purple-500 to-indigo-500",
  },
  {
    icon: ShieldCheck,
    title: "تضمین کیفیت",
    desc: "هر فودتراک قبل از انتشار توسط تیم ون جا بررسی می‌شه.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Smartphone,
    title: "نصب روی موبایل",
    desc: "مثل اپلیکیشن روی گوشیت نصبش کن. PWA، بدون دانلود از اپ‌استور.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Navigation,
    title: "مسیریابی سریع",
    desc: "لوکیشن امروز فودتراک رو ببین و با یک کلیک مسیر رو در گوگل‌مپ باز کن.",
    color: "from-yellow-500 to-orange-500",
  },
];

const testimonials = [
  {
    name: "محمد ک.",
    role: "صاحب فود تراک از تهران",
    text: "از وقتی فودتراکم رو توی ون جا ثبت کردم، مشتری‌های جدید خیلی راحت‌تر من رو پیدا می‌کنن. دیگه نیازی نیست توی استوری اینستاگرام توضیح بدم امروز کجام!",
  },
  {
    name: "فاطمه م.",
    role: "صاحب فود تراک از مشهد",
    text: "پنل مدیریت خیلی ساده‌ست. منو و عکس‌ها رو در پنج دقیقه آپلود کردم و همون روز اول نظر گرفتم. واقعاً ارزشش رو داره.",
  },
  {
    name: "رضا ص.",
    role: "کاربر از شیراز",
    text: "دیگه دنبال فودتراک مورد علاقم توی اینستا نمی‌گردم؛ توی ون جا می‌بینم امروز کجاست و مستقیم میرم سراغش.",
  },
];

/* ---------- Async server sections (streamed via Suspense) ---------- */

async function StatsSection() {
  const stats = await getSiteStats().catch(() => ({
    activeTrucks: 0,
    users: 0,
  }));
  return (
    <StatsStrip
      stats={{
        activeTrucks: stats.activeTrucks,
        users: stats.users,
        rating: 4.8,
        cities: IRAN_CITIES.length,
      }}
    />
  );
}

function StatsFallback() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 justify-center lg:justify-start"
        >
          <div className="w-12 h-12 rounded-2xl skeleton shrink-0" />
          <div className="space-y-2">
            <div className="h-7 w-16 rounded-lg skeleton" />
            <div className="h-3 w-20 rounded skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function CategoriesGrid() {
  const categories = await getHomeCategories().catch(() => []);

  if (categories.length === 0) {
    return (
      <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-gray-100">
        <MenuIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">هنوز دسته‌بندی‌ای ثبت نشده است</p>
      </div>
    );
  }

  return (
    <>
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        const color = cat.color || DEFAULT_CATEGORY_COLOR;
        return (
          <Link
            key={cat.id}
            href={`/businesses?cuisine=${encodeURIComponent(cat.nameFa)}`}
            className="group relative overflow-hidden rounded-3xl p-6 bg-white border border-gray-100 hover:border-transparent hover:shadow-2xl hover:shadow-orange-500/10 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 flex flex-col items-center text-center"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ backgroundColor: color }}
            />
            <div className="relative flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-3 group-hover:bg-white/20 group-hover:shadow-none transition-colors"
                style={{ backgroundColor: color }}
              >
                <Icon className="w-7 h-7" />
              </div>
              <h3 className="font-black text-gray-900 text-base sm:text-lg group-hover:text-white transition-colors">
                {cat.nameFa}
              </h3>
            </div>
          </Link>
        );
      })}
    </>
  );
}

function CategoriesFallback() {
  return (
    <>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="rounded-3xl p-6 bg-white border border-gray-100 flex flex-col items-center gap-3"
        >
          <div className="w-14 h-14 rounded-2xl skeleton" />
          <div className="w-16 h-3 rounded-full skeleton" />
        </div>
      ))}
    </>
  );
}

async function FeaturedBusinesses() {
  const businesses = await getFeaturedBusinesses(8).catch(() => []);

  if (businesses.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">هنوز فودتراکی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {businesses.map((biz) => (
        <BusinessCard key={biz.id} business={biz} />
      ))}
    </div>
  );
}

function FeaturedFallback() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl h-80 skeleton" />
      ))}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-white">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        {/* Background decoration — plain radial gradients instead of huge `blur-3xl`
            layers, which are very expensive to rasterise on mobile GPUs. */}
        <div aria-hidden className="absolute inset-0 -z-10 hero-glow" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Text */}
            <div className="text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-200 shadow-sm text-orange-700 text-xs sm:text-sm font-bold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <span className="font-black">ون جا، جای ون</span>
                <span className="text-orange-400">•</span>
                اولین پلتفرم تخصصی فودتراک‌های ایران
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 leading-[1.15] mb-6 tracking-tight">
                فودتراکت رو
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
                  همین الان پیدا کن
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                فودتراک مورد علاقه‌ت رو پیدا کن، ببین امروز کجاست، منوش رو ببین
                و نظر بده. یا اگه صاحب فودتراکی، مشتری‌های جدید پیدا کن.
              </p>

              <HeroSearch />

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ثبت‌نام رایگان
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  نسخه PWA
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {IRAN_CITIES.length}+ شهر فعال
                </div>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative">
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-pink-400 rounded-[3rem] rotate-3 opacity-20 scale-105" />
                <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-pink-400 rounded-[3rem] -rotate-2 opacity-30 scale-[1.02]" />

                <div className="relative w-full bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-orange-500/20 aspect-square">
                  <Image
                    src={HERO_TRUCK_IMAGE}
                    alt="فودتراک ون جا"
                    fill
                    preload
                    // Explicit sizes so mobile downloads a ~400px image, not a 1080px one.
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 448px, 448px"
                    className="object-contain p-4"
                  />
                </div>

                <div className="absolute -top-4 -right-2 sm:-right-6 bg-white rounded-2xl shadow-xl p-3 sm:p-4 flex items-center gap-3 motion-safe:animate-float">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-green-500 motion-safe:animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-900">
                      الان بازه!
                    </div>
                    <div className="text-[10px] text-gray-500">تا ۲۳:۰۰</div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-2 sm:-left-6 bg-white rounded-2xl shadow-xl p-3 sm:p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-gray-900">
                      ۴.۸ از ۵
                    </div>
                    <div className="text-[10px] text-gray-500">۲۸ نظر</div>
                  </div>
                </div>

                <div className="absolute top-1/2 -left-3 sm:-left-8 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-2.5 sm:p-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <div className="text-[11px] font-black text-gray-900 whitespace-nowrap">
                    تهران · ولیعصر
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Suspense fallback={<StatsFallback />}>
            <StatsSection />
          </Suspense>
        </div>
      </section>

      {/* CUISINE TYPES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-12">
            <div className="text-center sm:text-right max-w-2xl">
              <span className="text-xs font-black text-orange-500 tracking-wider uppercase">
                چی هوس کردی؟
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3 mb-3">
                هر چی دلت می‌خواد، اینجاست
              </h2>
              <p className="text-gray-500 text-lg">
                از برگر و کباب گرفته تا پیتزا و فلافل، فودتراک مناسب سلیقه‌ت رو
                پیدا کن
              </p>
            </div>
            <Link
              href="/businesses"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 font-bold text-sm hover:bg-orange-100 transition-colors shrink-0"
            >
              دسته‌های بیشتر
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <Suspense fallback={<CategoriesFallback />}>
              <CategoriesGrid />
            </Suspense>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-gray-50 cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black text-orange-500 tracking-wider uppercase">
              چرا ون جا؟
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3 mb-4">
              همه چیز برای پیدا کردن بهترین غذا
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              ون جا با تمرکز بر فودتراک‌ها، تجربه‌ای سریع، دقیق و لذت‌بخش برای
              پیدا کردن غذای خیابانی فراهم می‌کنه.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-8 rounded-3xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-[box-shadow,border-color] duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR TRUCKS */}
      <section className="py-24 bg-white cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-black text-orange-500 tracking-wider uppercase">
                محبوب‌ترین‌ها
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2">
                فودتراک‌های برتر این هفته
              </h2>
            </div>
            <Link
              href="/businesses"
              className="inline-flex items-center gap-2 text-orange-500 font-bold hover:text-orange-600 transition-colors"
            >
              مشاهده همه فودتراک‌ها
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <Suspense fallback={<FeaturedFallback />}>
            <FeaturedBusinesses />
          </Suspense>
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="py-24 bg-white cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 py-16 sm:px-16 sm:py-24 text-center cta-glow">
            <div className="relative max-w-2xl mx-auto flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-orange-300 text-xs sm:text-sm font-bold mb-6">
                <ChefHat className="w-4 h-4" />
                برای صاحبان فودتراک
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
                فودتراکت رو به{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                  هزاران مشتری
                </span>{" "}
                معرفی کن
              </h2>
              <p className="text-gray-300 text-lg sm:text-xl mb-10 leading-relaxed">
                همین حالا فودتراکت رو در ون جا ثبت کن. رایگان شروع کن، منو و
                موقعیتت رو به‌روز کن و مشتری‌های جدید رو جذب کن.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-lg hover:shadow-xl hover:shadow-orange-500/30 transition-shadow shadow-xl w-full sm:w-auto justify-center"
                >
                  <Sparkles className="w-5 h-5" />
                  ثبت رایگان فودتراک
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors border border-white/20 w-full sm:w-auto justify-center"
                >
                  مشاهده پلن‌ها
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-50/50 cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-black text-orange-500 tracking-wider uppercase">
              نظرات کاربران
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
              مردم درباره ون جا چی می‌گن؟
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 relative"
              >
                <Quote className="w-10 h-10 text-orange-100 absolute top-6 left-6" />
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-8 text-base relative z-10">
                  {t.text}
                </p>
                <div className="border-t border-gray-100 pt-6">
                  <div className="text-base font-bold text-gray-900">
                    {t.name}
                  </div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white cv-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black text-orange-500 tracking-wider uppercase">
              سوالات متداول
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
              سوالی داری؟
            </h2>
          </div>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      {/* Floating "back to top" — same control as the truck list page. This is the
          one client island that isn't interactive content, it just needs a window
          scroll listener, which a server component can't have. */}
      <BackToTop />

      <Footer />
    </div>
  );
}
