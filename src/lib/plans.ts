export const PLAN_LIMITS = {
  // `contactInfo` gates the food truck's announcement contact channels (phone number +
  // Instagram) shown on its public page — a pro-only perk. Telegram was removed entirely.
  free: { businesses: 1, menuItems: 10, photos: 3, label: "رایگان", priceMonthly: 0, contactInfo: false },
  pro: { businesses: 1, menuItems: 50, photos: 8, label: "حرفه‌ای", priceMonthly: 998000, contactInfo: true },
} as const;

// Truck owners can tag each food truck with at most this many categories.
export const MAX_BUSINESS_CATEGORIES = 3;

export type PlanId = keyof typeof PLAN_LIMITS;
