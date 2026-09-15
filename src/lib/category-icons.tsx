import {
  Beef,
  Flame,
  Pizza,
  Sandwich,
  Utensils,
  Salad,
  Soup,
  Drumstick,
  IceCream,
  CupSoda,
  Coffee,
  Fish,
  CakeSlice,
  Cookie,
  Popcorn,
  Wheat,
  Croissant,
  Candy,
  Milk,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated set of icons that admins can pick from when creating/editing a
 * food category. The `key` is what gets persisted to `categories.icon`.
 */
export const CATEGORY_ICON_OPTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "utensils", label: "عمومی", icon: Utensils },
  { key: "beef", label: "برگر / گوشت", icon: Beef },
  { key: "flame", label: "کباب", icon: Flame },
  { key: "pizza", label: "پیتزا", icon: Pizza },
  { key: "sandwich", label: "ساندویچ", icon: Sandwich },
  { key: "salad", label: "سالاد / گیاهی", icon: Salad },
  { key: "soup", label: "آش و سوپ", icon: Soup },
  { key: "drumstick", label: "فست فود", icon: Drumstick },
  { key: "ice-cream", label: "بستنی", icon: IceCream },
  { key: "cup-soda", label: "نوشیدنی", icon: CupSoda },
  { key: "coffee", label: "قهوه", icon: Coffee },
  { key: "fish", label: "غذای دریایی", icon: Fish },
  { key: "cake", label: "کیک و شیرینی", icon: CakeSlice },
  { key: "cookie", label: "کلوچه", icon: Cookie },
  { key: "popcorn", label: "پاپ کورن", icon: Popcorn },
  { key: "wheat", label: "نان", icon: Wheat },
  { key: "croissant", label: "کروسان", icon: Croissant },
  { key: "candy", label: "آب‌نبات", icon: Candy },
  { key: "milk", label: "لبنیات", icon: Milk },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.key, opt.icon])
);

export function getCategoryIcon(key?: string | null): LucideIcon {
  if (!key) return Utensils;
  return ICON_MAP[key] || Utensils;
}

export const DEFAULT_CATEGORY_COLOR = "#F97316";
