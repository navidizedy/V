"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PlanCard } from "@/components/plan-card";
import { PLAN_CARDS, getPlanPrice } from "@/lib/plan-content";
import { BackButton } from "@/components/back-button";

const PLAN_CTA: Record<string, { cta: string; href: string }> = {
  free: { cta: "شروع رایگان", href: "/auth/register" },
  pro: { cta: "ارتقا به حرفه‌ای", href: "/dashboard/subscription" },
};

// Pricing page plans are the single source of truth — the owner dashboard subscription
// page renders the exact same PLAN_CARDS content so the two stay perfectly in sync.
const plans = PLAN_CARDS.map((plan) => ({ ...plan, ...PLAN_CTA[plan.id] }));

const faqs = [
  { q: "آیا می‌توانم بدون پرداخت شروع کنم؟", a: "بله، پلن رایگان برای همیشه رایگان است و می‌توانید یک فودتراک را با امکانات پایه ثبت کنید." },
  { q: "آیا امکان لغو اشتراک وجود دارد؟", a: "بله، هر زمان می‌توانید اشتراک پلن حرفه‌ای را لغو کنید و در پایان دوره به پلن رایگان بازخواهید گشت." },
  { q: "روش‌های پرداخت چیست؟", a: "در حال حاضر پرداخت از طریق درگاه‌های بانکی ایرانی به‌زودی فعال می‌شود؛ فعلاً فعال‌سازی پلن حرفه‌ای به‌صورت آزمایشی و بدون پرداخت انجام می‌شود." },
  { q: "آیا می‌توانم قبل از پایان اشتراک فعلی دوباره پلن حرفه‌ای بخرم؟", a: "از ۷ روز مانده به پایان اعتبار اشتراک فعلی‌تان می‌توانید آن را تمدید کنید. پیش از آن باید صبر کنید تا وارد این بازه ۷ روزه شوید یا اشتراک فعلی منقضی شود." },
  { q: "اگر اشتراک حرفه‌ای من تمام شود و تمدید نکنم چه اتفاقی می‌افتد؟", a: "به‌صورت خودکار به پلن رایگان بازمی‌گردید: تیک آبی، اولویت نمایش، آمار پیشرفته و پشتیبانی اختصاصی غیرفعال می‌شوند و منو و گالری هر فودتراک به سقف پلن رایگان (۱۰ آیتم منو و ۳ عکس) محدود می‌شود." },
];

export default function PricingPage() {
  const priceFor = useMemo(() => (monthlyPrice: number) => getPlanPrice(monthlyPrice), []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <span className="text-xs font-bold text-primary tracking-wide">پلن‌ها و تعرفه‌ها</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-4">
            پلنی متناسب با فودتراک خودتو انتخاب کن
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto leading-7 mb-8">
            از ثبت رایگان تا ابزارهای حرفه‌ای برای رشد سریع‌تر؛ ون جا برای هر مرحله از فودتراک شما یک پلن دارد.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const price = priceFor(plan.monthlyPrice);
            return (
              <div key={plan.id} className={plan.highlight ? "lg:-translate-y-4" : ""}>
                <PlanCard
                  plan={plan}
                  price={price}
                  topBadge={plan.highlight ? "محبوب‌ترین" : undefined}
                  footer={
                    <Link
                      href={plan.href}
                      className={`text-center px-5 py-3 rounded-xl text-sm font-bold transition-all block ${
                        plan.highlight
                          ? "bg-white text-primary hover:bg-gray-50"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">سوالات رایج درباره پلن‌ها</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">{f.q}</h3>
                <p className="text-sm text-gray-500 leading-7">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
