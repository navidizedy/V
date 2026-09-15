import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("fa-IR").format(num);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatTime(time: string | null | undefined) {
  if (!time || !time.includes(":")) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const period = hour >= 12 ? "ب.ظ" : "ق.ظ";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour.toString().padStart(2, "0")}:${m} ${period}`;
}

export function getPersianDayName(day: string) {
  const days: Record<string, string> = {
    saturday: "شنبه",
    sunday: "یکشنبه",
    monday: "دوشنبه",
    tuesday: "سه‌شنبه",
    wednesday: "چهارشنبه",
    thursday: "پنجشنبه",
    friday: "جمعه",
  };
  return days[day] || day;
}

export function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

export function getCurrentPersianDay(): string {
  const dayIndex = new Date().getDay();
  const persianDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return persianDays[dayIndex];
}
