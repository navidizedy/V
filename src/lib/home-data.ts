import { unstable_cache } from "next/cache";
import { and, count, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { businesses, ownerProfiles, users } from "@/db/schema";
import { fetchCategoriesForBusinesses } from "@/lib/business-categories";
import { getCategories } from "@/lib/categories-cache";
import { toPublicImageUrl } from "@/lib/image-url";

/**
 * Data for the (server-rendered) homepage.
 *
 * Previously the homepage was a client component that fetched `/api/businesses`
 * and `/api/stats` after hydration — a 3-hop waterfall (HTML → JS → JSON) before
 * any real content appeared. Now the data is read straight from the database on
 * the server, cached for 60s, and streamed as HTML. The client receives finished
 * markup and only hydrates the tiny interactive islands.
 */

export type HomeBusiness = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  city: string | null;
  locationText: string;
  phone: string | null;
  isOpen: boolean;
  rating: string | null;
  reviewCount: number | null;
  views: number | null;
  ownerPlan: "free" | "pro" | null;
  categories: { id: number; nameFa: string; color: string | null }[];
  categoryName: string | null;
  categoryColor: string | null;
};

export const getFeaturedBusinesses = unstable_cache(
  async (limit = 8): Promise<HomeBusiness[]> => {
    const rows = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        description: businesses.description,
        logo: businesses.logo,
        coverImage: businesses.coverImage,
        city: businesses.city,
        locationText: businesses.locationText,
        phone: businesses.phone,
        isOpen: businesses.isOpen,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount,
        views: businesses.views,
        updatedAt: businesses.updatedAt,
        ownerPlan: ownerProfiles.plan,
      })
      .from(businesses)
      .leftJoin(ownerProfiles, eq(businesses.ownerId, ownerProfiles.userId))
      .where(and(eq(businesses.status, "approved"), eq(businesses.truckType, "food")))
      .orderBy(desc(businesses.rating), desc(businesses.reviewCount))
      .limit(limit);

    const categoriesMap = await fetchCategoriesForBusinesses(rows.map((b) => b.id));

    return rows.map(({ updatedAt, ...b }) => ({
      ...b,
      logo: toPublicImageUrl("business-logo", b.id, b.logo, updatedAt),
      coverImage: toPublicImageUrl("business-cover", b.id, b.coverImage, updatedAt),
      categories: (categoriesMap[b.id] || []).map((c) => ({ id: c.id, nameFa: c.nameFa, color: c.color })),
      categoryName: categoriesMap[b.id]?.[0]?.nameFa || null,
      categoryColor: categoriesMap[b.id]?.[0]?.color || null,
    }));
  },
  ["home-featured-businesses"],
  { revalidate: 60, tags: ["businesses"] }
);

export const getSiteStats = unstable_cache(
  async () => {
    const [[activeBusinesses], [totalUsers]] = await Promise.all([
      db.select({ count: count() }).from(businesses).where(eq(businesses.status, "approved")),
      db
        .select({ count: count() })
        .from(users)
        .where(or(eq(users.role, "user"), eq(users.role, "owner"))),
    ]);
    return { activeTrucks: activeBusinesses.count, users: totalUsers.count };
  },
  ["home-site-stats"],
  { revalidate: 60, tags: ["stats"] }
);

export async function getHomeCategories() {
  const cats = await getCategories();
  return cats.map((c) => ({ id: c.id, name: c.name, nameFa: c.nameFa, icon: c.icon, color: c.color }));
}
