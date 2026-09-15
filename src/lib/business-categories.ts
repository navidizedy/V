import { db } from "@/db";
import { businessCategories, categories } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { MAX_BUSINESS_CATEGORIES } from "@/lib/plans";

export type CategoryBadge = {
  id: number;
  name: string;
  nameFa: string;
  icon: string | null;
  color: string | null;
};

/**
 * Fetches the categories assigned to a list of businesses in a single query
 * and groups them by businessId.
 */
export async function fetchCategoriesForBusinesses(
  businessIds: number[]
): Promise<Record<number, CategoryBadge[]>> {
  if (businessIds.length === 0) return {};

  const rows = await db
    .select({
      businessId: businessCategories.businessId,
      id: categories.id,
      name: categories.name,
      nameFa: categories.nameFa,
      icon: categories.icon,
      color: categories.color,
    })
    .from(businessCategories)
    .innerJoin(categories, eq(businessCategories.categoryId, categories.id))
    .where(inArray(businessCategories.businessId, businessIds));

  const map: Record<number, CategoryBadge[]> = {};
  for (const row of rows) {
    if (!map[row.businessId]) map[row.businessId] = [];
    map[row.businessId].push({ id: row.id, name: row.name, nameFa: row.nameFa, icon: row.icon, color: row.color });
  }
  return map;
}

export async function fetchCategoriesForBusiness(businessId: number): Promise<CategoryBadge[]> {
  const map = await fetchCategoriesForBusinesses([businessId]);
  return map[businessId] || [];
}

/**
 * Replaces the set of categories assigned to a business.
 */
export async function setBusinessCategories(businessId: number, categoryIds: (number | string)[]) {
  await db.delete(businessCategories).where(eq(businessCategories.businessId, businessId));
  const uniqueIds = Array.from(
    new Set(
      categoryIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
    // Truck owners may pick at most MAX_BUSINESS_CATEGORIES categories — this is enforced
    // in the API routes too, but capped again here as a last line of defense.
  ).slice(0, MAX_BUSINESS_CATEGORIES);
  if (uniqueIds.length === 0) return;
  await db.insert(businessCategories).values(uniqueIds.map((categoryId) => ({ businessId, categoryId })));
}
