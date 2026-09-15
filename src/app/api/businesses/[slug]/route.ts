import { NextRequest, NextResponse } from "next/server";
import { toPublicImageUrl, isProxiedImageUrl } from "@/lib/image-url";
import { db } from "@/db";
import { businesses, businessHours, users, ownerProfiles, reviews, favorites, businessPhotos } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoriesForBusiness, setBusinessCategories } from "@/lib/business-categories";
import {
  runValidators,
  validateAddress,
  validateBusinessName,
  validateBusinessPhone,
  validateCity,
  validateDescription,
  validateIdList,
  validateImageData,
  validateInstagram,
  validateMapLink,
  validateWebsite,
  type FieldResult,
} from "@/lib/validators";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const business = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        description: businesses.description,
        logo: businesses.logo,
        coverImage: businesses.coverImage,
        city: businesses.city,
        locationText: businesses.locationText,
        locationLink: businesses.locationLink,
        phone: businesses.phone,
        instagram: businesses.instagram,
        website: businesses.website,
        isOpen: businesses.isOpen,
        rating: businesses.rating,
        reviewCount: businesses.reviewCount,
        views: businesses.views,
        status: businesses.status,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        ownerName: users.name,
        ownerAvatar: ownerProfiles.avatar,
        ownerAvatarUpdatedAt: ownerProfiles.updatedAt,
        ownerId: businesses.ownerId,
        ownerPlan: ownerProfiles.plan,
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.ownerId, users.id))
      .leftJoin(ownerProfiles, eq(businesses.ownerId, ownerProfiles.userId))
      .where(eq(businesses.slug, slug))
      .limit(1);

    if (!business.length) {
      return NextResponse.json({ error: "فودتراک یافت نشد" }, { status: 404 });
    }

    const viewerSession = await getServerSession(authOptions);
    const isOwnerViewing = viewerSession?.user?.id === String(business[0].ownerId);

    let hours = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.businessId, business[0].id))
      .orderBy(businessHours.day);

    // Self-heal legacy / malformed businesses with missing hours.
    if (hours.length === 0) {
      const defaultHours = [
        { day: "saturday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "sunday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "monday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "tuesday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "wednesday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "thursday", openTime: "11:00", closeTime: "23:00", isClosed: false },
        { day: "friday", openTime: null, closeTime: null, isClosed: true },
      ];
      for (const item of defaultHours) {
        await db.insert(businessHours).values({
          businessId: business[0].id,
          day: item.day as any,
          openTime: item.openTime,
          closeTime: item.closeTime,
          isClosed: item.isClosed,
        });
      }
      hours = await db
        .select()
        .from(businessHours)
        .where(eq(businessHours.businessId, business[0].id))
        .orderBy(businessHours.day);
    }

    const photos = await db
      .select()
      .from(businessPhotos)
      .where(eq(businessPhotos.businessId, business[0].id))
      .orderBy(desc(businessPhotos.createdAt));

    const businessReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        userName: users.name,
        userId: reviews.userId,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.businessId, business[0].id))
      .orderBy(desc(reviews.createdAt))
      .limit(10);

    let isFavorited = false;
    if (viewerSession?.user?.id) {
      const fav = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.businessId, business[0].id), eq(favorites.userId, parseInt(viewerSession.user.id))))
        .limit(1);
      isFavorited = fav.length > 0;
    }

    const businessCategoriesList = await fetchCategoriesForBusiness(business[0].id);

    const b = business[0];
    return NextResponse.json({
      ...b,
      // Base64 images are proxied through /api/images so the payload stays small and
      // next/image can serve resized AVIF/WebP versions.
      logo: toPublicImageUrl("business-logo", b.id, b.logo, b.updatedAt),
      coverImage: toPublicImageUrl("business-cover", b.id, b.coverImage, b.updatedAt),
      ownerAvatar: toPublicImageUrl("avatar", b.ownerId, b.ownerAvatar, b.ownerAvatarUpdatedAt),
      ownerAvatarUpdatedAt: undefined,
      categories: businessCategoriesList,
      categoryName: businessCategoriesList[0]?.nameFa || null,
      categoryColor: businessCategoriesList[0]?.color || null,
      hours,
      photos: photos.map((p) => ({ ...p, url: toPublicImageUrl("photo", p.id, p.url, p.createdAt) })),
      reviews: businessReviews,
      isFavorited,
      isOwner: isOwnerViewing,
    });
  } catch (error) {
    console.error("GET /api/businesses/[slug] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Owners/admins previewing their own content should not inflate analytics.
    if (session?.user?.id === String(business.ownerId) || session?.user?.role === "admin") {
      return NextResponse.json({ counted: false, views: business.views || 0 });
    }

    const [updated] = await db
      .update(businesses)
      .set({ views: sql`coalesce(${businesses.views}, 0) + 1` })
      .where(eq(businesses.id, business.id))
      .returning({ views: businesses.views });

    return NextResponse.json({ counted: true, views: updated?.views || 0 });
  } catch (error) {
    console.error("POST /api/businesses/[slug] view error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (!business.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (business[0].ownerId !== parseInt(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { PLAN_LIMITS, MAX_BUSINESS_CATEGORIES } = await import("@/lib/plans");

    // Owner-initiated resubmission: once a truck announcement has been declined, the owner
    // can send it back for review instead of it staying rejected forever. This intentionally
    // only moves rejected -> pending (never touches already-approved/pending announcements),
    // and only the truck's own owner can trigger it (admins already have their own "بررسی
    // مجدد" control in the admin panel).
    if (body.action === "resubmit") {
      if (business[0].ownerId !== parseInt(session.user.id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (business[0].status !== "rejected") {
        return NextResponse.json({ error: "فقط فودتراک‌های رد شده قابل ارسال مجدد هستند" }, { status: 400 });
      }
      await db
        .update(businesses)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(businesses.id, business[0].id));
      return NextResponse.json({ success: true, status: "pending" });
    }

    // Contact info (phone number + Instagram) is a pro-only perk — admins bypass this.
    let allowContactInfo = true;
    if (session.user.role !== "admin" && (body.phone !== undefined || body.instagram !== undefined)) {
      const { enforceExpiredPlan, getOwnerProfile } = await import("@/lib/subscription");
      await enforceExpiredPlan(business[0].ownerId);
      const owner = await getOwnerProfile(business[0].ownerId);
      allowContactInfo = PLAN_LIMITS[owner?.plan || "free"].contactInfo;
    }

    // Partial update: only the fields that were sent are validated & written, but each one that
    // *is* sent must satisfy the same rules as on creation (Persian text, valid phone, etc.).
    const checks: Record<string, FieldResult<unknown>> = {};
    if (body.name !== undefined) checks.name = validateBusinessName(body.name);
    if (body.description !== undefined) checks.description = validateDescription(body.description);
    if (body.city !== undefined) checks.city = validateCity(body.city);
    if (body.locationText !== undefined) checks.locationText = validateAddress(body.locationText);
    if (body.locationLink !== undefined) checks.locationLink = validateMapLink(body.locationLink, false);
    if (body.phone !== undefined) checks.phone = validateBusinessPhone(body.phone, false);
    if (body.instagram !== undefined) checks.instagram = validateInstagram(body.instagram, false);
    if (body.website !== undefined) checks.website = validateWebsite(body.website, false);
    if (body.logo !== undefined) checks.logo = validateImageData(body.logo, { label: "لوگو" });
    if (body.coverImage !== undefined) checks.coverImage = validateImageData(body.coverImage, { label: "تصویر کاور" });
    if (body.categoryIds !== undefined) {
      checks.categoryIds = validateIdList(body.categoryIds, { min: 1, max: MAX_BUSINESS_CATEGORIES, label: "دسته‌بندی غذایی" });
    }
    if (body.isOpen !== undefined && typeof body.isOpen !== "boolean") {
      return NextResponse.json({ error: "وضعیت باز/بسته نامعتبر است" }, { status: 400 });
    }

    const { values, errors, valid, firstError } = runValidators(checks);
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });
    const v = values as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if ("name" in v) updateData.name = v.name;
    if ("description" in v) updateData.description = (v.description as string) || null;
    if ("city" in v) updateData.city = v.city;
    if ("locationText" in v) updateData.locationText = v.locationText;
    if ("locationLink" in v) updateData.locationLink = (v.locationLink as string) || null;
    if ("phone" in v) updateData.phone = allowContactInfo ? (v.phone as string) || null : null;
    if ("instagram" in v) updateData.instagram = allowContactInfo ? (v.instagram as string) || null : null;
    if ("website" in v) updateData.website = (v.website as string) || null;
    if (body.isOpen !== undefined) updateData.isOpen = body.isOpen;
    // A proxied `/api/images/...` URL means the client echoed back the unchanged image —
    // never overwrite the stored base64 with that reference.
    if ("logo" in v && !isProxiedImageUrl(body.logo)) updateData.logo = v.logo;
    if ("coverImage" in v && !isProxiedImageUrl(body.coverImage)) updateData.coverImage = v.coverImage;
    updateData.updatedAt = new Date();

    await db.update(businesses).set(updateData).where(eq(businesses.id, business[0].id));

    if ("categoryIds" in v) {
      await setBusinessCategories(business[0].id, v.categoryIds as number[]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/businesses/[slug] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (!business.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (business[0].ownerId !== parseInt(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(businesses).where(eq(businesses.id, business[0].id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/businesses/[slug] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
