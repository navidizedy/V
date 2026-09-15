import { Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

export type PlanFeature = { label: string; ok: boolean };

export type PlanCardContent = {
  id: PlanId;
  name: string;
  icon: LucideIcon;
  monthlyPrice: number;
  description: string;
  features: PlanFeature[];
  highlight: boolean;
};

// Single source of truth for plan marketing content (pricing page + owner dashboard subscription page
// must always render an identical copy of this list, so keep everything here).
export const PLAN_CARDS: PlanCardContent[] = [
  {
    id: "free",
    name: PLAN_LIMITS.free.label,
    icon: Rocket,
    monthlyPrice: PLAN_LIMITS.free.priceMonthly,
    description: "برای شروع و تست ون جا",
    features: [
      { label: "ثبت یک فودتراک", ok: true },
      { label: "نمایش موقعیت و ساعات کاری", ok: true },
      { label: "منو تا ۱۰ آیتم", ok: true },
      { label: "تا ۳ عکس در گالری", ok: true },
      { label: "نمایش در نتایج جستجو", ok: true },
      { label: "نمایش شماره تماس و اینستاگرام", ok: false },
      { label: "اولویت در صفحه اصلی", ok: false },
      { label: "دریافت تیک آبی", ok: false },
      { label: "آمار و گزارش پیشرفته", ok: false },
      { label: "پشتیبانی اختصاصی", ok: false },
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: PLAN_LIMITS.pro.label,
    icon: Sparkles,
    monthlyPrice: PLAN_LIMITS.pro.priceMonthly,
    description: "برای فودتراک‌های فعال و در حال رشد",
    features: [
      { label: "ثبت یک فودتراک", ok: true },
      { label: "نمایش موقعیت و ساعات کاری", ok: true },
      { label: "منو تا ۵۰ آیتم", ok: true },
      { label: "تا ۸ عکس در گالری", ok: true },
      { label: "اولویت در نتایج جستجو", ok: true },
      { label: "نمایش شماره تماس و اینستاگرام", ok: true },
      { label: "دریافت تیک آبی", ok: true },
      { label: "آمار و گزارش پیشرفته", ok: true },
      { label: "پشتیبانی اختصاصی", ok: true },
    ],
    highlight: true,
  },
];

const toFa = (n: number) => n.toLocaleString("fa-IR");

// Only monthly billing is offered for now (annual billing removed).
export function getPlanPrice(monthlyPrice: number) {
  if (monthlyPrice === 0) {
    return { display: "۰", period: "همیشه رایگان", note: null as string | null };
  }

  return {
    display: toFa(Math.round(monthlyPrice / 1000)),
    period: "هزار تومان / ماه",
    note: null as string | null,
  };
}
