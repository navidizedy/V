import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ownerProfiles, businesses, menuItems, businessPhotos } from "@/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";

// Once a paid plan has this many days (or fewer) left, the owner is allowed to
// renew early and the UI switches into its red "expiring soon" warning state.
export const RENEWAL_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left until `planExpiresAt`, rounded up so "23 hours left" still reads
// as "۱ روز" instead of "۰ روز". Returns null when there's no expiry to count down.
export function getDaysRemaining(planExpiresAt: Date | string | null | undefined): number | null {
  if (!planExpiresAt) return null;
  const diffMs = new Date(planExpiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / DAY_MS);
}

export function isExpired(planExpiresAt: Date | string | null | undefined): boolean {
  const days = getDaysRemaining(planExpiresAt);
  return days !== null && days <= 0;
}

// Owners can buy/renew a subscription once they're inside the last 7 days of
// their current one (or once it has already expired / they're on the free plan).
export function isWithinRenewalWindow(planExpiresAt: Date | string | null | undefined): boolean {
  const days = getDaysRemaining(planExpiresAt);
  return days === null || days <= RENEWAL_WINDOW_DAYS;
}

// Only truck owners have a subscription plan/avatar at all — this returns
// their `owner_profiles` row, lazily creating a default "free" one on first
// access (e.g. right after registering as an owner or being promoted to one).
export async function getOwnerProfile(userId: number) {
  const [existing] = await db.select().from(ownerProfiles).where(eq(ownerProfiles.userId, userId)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(ownerProfiles).values({ userId }).onConflictDoNothing().returning();
  if (created) return created;

  // Extremely unlikely race: another request created it between our select and insert.
  const [retry] = await db.select().from(ownerProfiles).where(eq(ownerProfiles.userId, userId)).limit(1);
  return retry ?? null;
}

/**
 * Lazily checked on every plan-sensitive request: if the user's paid plan has
 * expired, downgrade them to "free" AND enforce the free plan's limits on data
 * they already created while on the higher plan — trimming menu items and
 * gallery photos down to the free allowance per food truck (oldest entries are
 * kept, the newest ones over the limit are removed). The verified/"پلاس" badge,
 * priority placement, advanced stats and dedicated support all disappear on
 * their own since those are derived live from `plan === "pro"` everywhere.
 */
export async function enforceExpiredPlan(userId: number) {
  const user = await getOwnerProfile(userId);

  if (!user) return null;

  if (user.plan === "free" || !user.planExpiresAt || !isExpired(user.planExpiresAt)) {
    return user;
  }

  await db
    .update(ownerProfiles)
    .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
    .where(eq(ownerProfiles.userId, userId));

  const freeLimits = PLAN_LIMITS.free;
  const myBusinesses = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerId, userId));

  if (myBusinesses.length) {
    // Contact info (phone number + Instagram) is a pro-only perk — once the owner drops
    // back to the free plan those announcement channels must disappear immediately.
    await db
      .update(businesses)
      .set({ phone: null, instagram: null })
      .where(eq(businesses.ownerId, userId));
  }

  for (const biz of myBusinesses) {
    // Menu items — keep the oldest `freeLimits.menuItems` items for this truck, drop the rest.
    const items = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.businessId, biz.id))
      .orderBy(asc(menuItems.createdAt));
    if (items.length > freeLimits.menuItems) {
      const idsToRemove = items.slice(freeLimits.menuItems).map((i) => i.id);
      if (idsToRemove.length) {
        await db.delete(menuItems).where(inArray(menuItems.id, idsToRemove));
      }
    }

    // Gallery photos — keep the oldest `freeLimits.photos` photos for this truck, drop the rest.
    const photos = await db
      .select({ id: businessPhotos.id })
      .from(businessPhotos)
      .where(eq(businessPhotos.businessId, biz.id))
      .orderBy(asc(businessPhotos.createdAt));
    if (photos.length > freeLimits.photos) {
      const idsToRemove = photos.slice(freeLimits.photos).map((p) => p.id);
      if (idsToRemove.length) {
        await db.delete(businessPhotos).where(inArray(businessPhotos.id, idsToRemove));
      }
    }
  }

  return { plan: "free" as const, planExpiresAt: null as Date | null };
}
