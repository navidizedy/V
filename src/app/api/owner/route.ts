import { NextRequest, NextResponse } from "next/server";
import { toPublicImageUrl } from "@/lib/image-url";
import { db } from "@/db";
import { businesses, menuItems, reviews, businessHours, favorites, users } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoriesForBusinesses } from "@/lib/business-categories";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "businesses") {
      const result = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          slug: businesses.slug,
          description: businesses.description,
          status: businesses.status,
          city: businesses.city,
          locationText: businesses.locationText,
          logo: businesses.logo,
          coverImage: businesses.coverImage,
          phone: businesses.phone,
          instagram: businesses.instagram,
          isOpen: businesses.isOpen,
          rating: businesses.rating,
          reviewCount: businesses.reviewCount,
          views: businesses.views,
          createdAt: businesses.createdAt,
          updatedAt: businesses.updatedAt,
        })
        .from(businesses)
        .where(eq(businesses.ownerId, parseInt(session.user.id)))
        .orderBy(desc(businesses.createdAt));

      const categoriesMap = await fetchCategoriesForBusinesses(result.map((b) => b.id));
      const withCategories = result.map((b) => ({
        ...b,
        logo: toPublicImageUrl("business-logo", b.id, b.logo, b.updatedAt),
        coverImage: toPublicImageUrl("business-cover", b.id, b.coverImage, b.updatedAt),
        categories: categoriesMap[b.id] || [],
        categoryName: categoriesMap[b.id]?.map((c) => c.nameFa).join("، ") || null,
      }));
      return NextResponse.json(withCategories);
    }

    if (type === "stats") {
      const myBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, parseInt(session.user.id)));

      const businessIds = myBusinesses.map((b) => b.id);
      let totalReviews = 0;
      let totalViews = 0;

      for (const id of businessIds) {
        const [reviewCount] = await db.select({ count: count() }).from(reviews).where(eq(reviews.businessId, id));
        totalReviews += reviewCount.count;
        const biz = myBusinesses.find((b) => b.id === id);
        if (biz) totalViews += biz.views || 0;
      }

      return NextResponse.json({
        businessCount: myBusinesses.length,
        totalReviews,
        totalViews,
        pendingCount: myBusinesses.filter((b) => b.status === "pending").length,
      });
    }

    // Advanced reports & analytics — exclusive to the "pro" plan (matches the
    // "آمار و گزارش پیشرفته" perk promised on the pricing/subscription plan cards).
    if (type === "advanced-stats") {
      const userId = parseInt(session.user.id);
      const { enforceExpiredPlan, getOwnerProfile } = await import("@/lib/subscription");
      await enforceExpiredPlan(userId);
      const me = await getOwnerProfile(userId);
      if (session.user.role !== "admin" && me?.plan !== "pro") {
        return NextResponse.json({ error: "این گزارش مخصوص پلن حرفه‌ای است" }, { status: 403 });
      }

      const myBusinesses = await db.select().from(businesses).where(eq(businesses.ownerId, userId));

      const perBusiness = [];
      let totalFavorites = 0;
      let totalMenuItems = 0;
      for (const b of myBusinesses) {
        const [reviewCount] = await db.select({ count: count() }).from(reviews).where(eq(reviews.businessId, b.id));
        const [favoriteCount] = await db.select({ count: count() }).from(favorites).where(eq(favorites.businessId, b.id));
        const [menuCount] = await db.select({ count: count() }).from(menuItems).where(eq(menuItems.businessId, b.id));
        totalFavorites += favoriteCount.count;
        totalMenuItems += menuCount.count;
        perBusiness.push({
          id: b.id,
          name: b.name,
          slug: b.slug,
          views: b.views || 0,
          rating: b.rating,
          reviewCount: reviewCount.count,
          favoriteCount: favoriteCount.count,
          menuItemCount: menuCount.count,
        });
      }

      perBusiness.sort((a, b) => b.views - a.views);

      const totalViews = perBusiness.reduce((sum, b) => sum + b.views, 0);
      const totalReviewsAll = perBusiness.reduce((sum, b) => sum + b.reviewCount, 0);
      const ratedBusinesses = myBusinesses.filter((b) => b.rating && parseFloat(b.rating) > 0);
      const avgRating = ratedBusinesses.length
        ? ratedBusinesses.reduce((sum, b) => sum + parseFloat(b.rating || "0"), 0) / ratedBusinesses.length
        : 0;
      const engagementRate = totalViews > 0 ? ((totalReviewsAll + totalFavorites) / totalViews) * 100 : 0;

      return NextResponse.json({
        summary: {
          totalViews,
          totalReviews: totalReviewsAll,
          totalFavorites,
          totalMenuItems,
          avgRating: Math.round(avgRating * 10) / 10,
          engagementRate: Math.round(engagementRate * 10) / 10,
        },
        topPerformer: perBusiness[0] || null,
        perBusiness,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/owner error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
