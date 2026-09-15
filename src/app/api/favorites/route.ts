import { NextRequest, NextResponse } from "next/server";
import { toPublicImageUrl } from "@/lib/image-url";
import { db } from "@/db";
import { favorites, businesses } from "@/db/schema";
import { failed, validateId } from "@/lib/validators";
import { eq, and, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoriesForBusinesses } from "@/lib/business-categories";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db
      .select({
        id: favorites.id,
        businessId: favorites.businessId,
        createdAt: favorites.createdAt,
        businessName: businesses.name,
        businessSlug: businesses.slug,
        businessLogo: businesses.logo,
        businessCoverImage: businesses.coverImage,
        businessCity: businesses.city,
        businessLocation: businesses.locationText,
        businessIsOpen: businesses.isOpen,
        businessRating: businesses.rating,
        businessReviewCount: businesses.reviewCount,
        businessViews: businesses.views,
        businessUpdatedAt: businesses.updatedAt,
      })
      .from(favorites)
      .leftJoin(businesses, eq(favorites.businessId, businesses.id))
      .where(eq(favorites.userId, parseInt(session.user.id)))
      .orderBy(desc(favorites.createdAt));

    const categoriesMap = await fetchCategoriesForBusinesses(result.map((r) => r.businessId));
    const withCategories = result.map((r) => ({
      ...r,
      businessLogo: toPublicImageUrl("business-logo", r.businessId, r.businessLogo, r.businessUpdatedAt),
      businessCoverImage: toPublicImageUrl("business-cover", r.businessId, r.businessCoverImage, r.businessUpdatedAt),
      categoryName: categoriesMap[r.businessId]?.map((c) => c.nameFa).join("، ") || null,
    }));

    return NextResponse.json(withCategories);
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const idCheck = validateId(body?.businessId, "شناسه فودتراک");
    if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
    const [target] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, idCheck.value)).limit(1);
    if (!target) return NextResponse.json({ error: "فودتراک یافت نشد" }, { status: 404 });
    body.businessId = idCheck.value;
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.businessId, body.businessId), eq(favorites.userId, parseInt(session.user.id))))
      .limit(1);

    if (existing.length) {
      await db.delete(favorites).where(eq(favorites.id, existing[0].id));
      return NextResponse.json({ favorited: false });
    }

    await db.insert(favorites).values({
      businessId: body.businessId,
      userId: parseInt(session.user.id),
    });

    return NextResponse.json({ favorited: true });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
