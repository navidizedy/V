import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, categories, businessHours, users, ownerProfiles, menuItems, businessCategories, businessPhotos, menuCategories } from "@/db/schema";
import { eq, desc, asc, and, like, or, sql, type SQL } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCategoriesForBusinesses, setBusinessCategories } from "@/lib/business-categories";
import { rateLimitPresets } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { toPublicImageUrl } from "@/lib/image-url";

// This route reads filters (search/city/cuisine/openNow/sort/...) from the query string, so it
// must never be statically optimised/cached by Next itself — every combination of filters is a
// different result set. Without this, some hosts will happily serve a cached response for the
// *first* query string variant to every subsequent request, which is exactly why "فقط بازها" /
// search looked broken only in production while working fine in `next dev` (dev never caches
// route handlers).
export const dynamic = "force-dynamic";
import {
  failed,
  runValidators,
  validateAddress,
  validateBusinessName,
  validateBusinessPhone,
  validateCity,
  validateDescription,
  validateHours,
  validateIdList,
  validateImageData,
  validateInstagram,
  validateMapLink,
  validateMenuCategoryName,
  validateMenuItemDescription,
  validateMenuItemName,
  validatePrice,
  validateWebsite,
} from "@/lib/validators";

export async function GET(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimitPresets.public(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "درخواست‌های بیش از حد. لطفاً کمی صبر کنید." },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const cuisine = searchParams.get("cuisine");
    const openNow = searchParams.get("openNow");
    const sort = searchParams.get("sort") || "newest";
    const status = searchParams.get("status") || "approved";
    // Clamp the page size so a stray `?limit=10000` can never ask the DB for the
    // whole table at once — the list page asks for one 20-item page at a time.
    const MAX_PAGE_SIZE = 100;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1),
      MAX_PAGE_SIZE,
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    const conditions: SQL[] = [eq(businesses.status, status as any), eq(businesses.truckType, "food")];

    if (category && category !== "all") {
      conditions.push(sql`exists (
        select 1 from ${businessCategories}
        where ${businessCategories.businessId} = ${businesses.id}
          and ${businessCategories.categoryId} = ${parseInt(category)}
      )`);
    }
    if (city && city !== "all") {
      conditions.push(eq(businesses.city, city));
    }
    if (openNow === "true") {
      conditions.push(eq(businesses.isOpen, true));
    }
    if (search) {
      const sanitizedSearch = sanitizeText(search, 100);
      const term = `%${sanitizedSearch}%`;
      conditions.push(
        or(
          like(businesses.name, term),
          like(businesses.description, term),
          like(businesses.locationText, term),
          like(businesses.city, term),
          sql`exists (
            select 1 from ${menuItems}
            where ${menuItems.businessId} = ${businesses.id}
              and (${menuItems.name} ilike ${term} or ${menuItems.category} ilike ${term})
          )`
        ) as SQL
      );
    }
    if (cuisine) {
      const cuisineTerm = `%${cuisine}%`;
      // NOTE: this whole OR must be wrapped in parentheses — otherwise it breaks out of the
      // surrounding `and(...conditions)` (SQL operator precedence: AND binds tighter than OR),
      // which previously let rejected/pending businesses leak into public results whenever a
      // cuisine/category filter was applied (e.g. browsing via the homepage category chips).
      conditions.push(sql`(
        exists (
          select 1 from ${menuItems}
          where ${menuItems.businessId} = ${businesses.id}
            and (${menuItems.name} ilike ${cuisineTerm} or ${menuItems.category} ilike ${cuisineTerm})
        ) or exists (
          select 1 from ${businessCategories}
          inner join ${categories} on ${categories.id} = ${businessCategories.categoryId}
          where ${businessCategories.businessId} = ${businesses.id}
            and (${categories.nameFa} ilike ${cuisineTerm} or ${categories.name} ilike ${cuisineTerm})
        )
      )`);
    }

    const orderBy =
      sort === "rating"
        ? [desc(businesses.rating), desc(businesses.reviewCount)]
        : sort === "views"
        ? [desc(businesses.views)]
        : sort === "name"
        ? [asc(businesses.name)]
        : [desc(businesses.createdAt)];

    const result = await db
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
        status: businesses.status,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
        ownerName: users.name,
        ownerPlan: ownerProfiles.plan,
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.ownerId, users.id))
      .leftJoin(ownerProfiles, eq(businesses.ownerId, ownerProfiles.userId))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const whereClause = and(...conditions);

    const [categoriesMap, citiesResult, totalResult] = await Promise.all([
      fetchCategoriesForBusinesses(result.map((b) => b.id)),
      // Available cities for the filter dropdown (runs in parallel with categories)
      db
        .select({ city: businesses.city })
        .from(businesses)
        .where(and(eq(businesses.status, "approved"), eq(businesses.truckType, "food")))
        .groupBy(businesses.city),
      // Total number of matches for the *current* filters, so the client can render
      // "showing 1–20 of 137" and know when to stop infinite-scrolling.
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(businesses)
        .where(whereClause),
    ]);

    // Images are stored as base64 in the DB. Never ship that inside list JSON —
    // reference them via the cacheable /api/images route so next/image can optimise them.
    const businessesWithCategories = result.map((business) => ({
      ...business,
      logo: toPublicImageUrl("business-logo", business.id, business.logo, business.updatedAt),
      coverImage: toPublicImageUrl("business-cover", business.id, business.coverImage, business.updatedAt),
      categories: categoriesMap[business.id] || [],
      categoryName: categoriesMap[business.id]?.[0]?.nameFa || null,
      categoryColor: categoriesMap[business.id]?.[0]?.color || null,
    }));

    const total = totalResult[0]?.count ?? businessesWithCategories.length;

    return NextResponse.json({
      businesses: businessesWithCategories,
      cities: citiesResult.map((c) => c.city).filter(Boolean),
      // Real match count for the active filters (used for pagination metadata).
      total,
      // Offset of the first item in this page (0-based).
      offset,
      limit,
      hasMore: offset + businessesWithCategories.length < total,
    }, {
      headers: {
        // Results depend entirely on the query string (search/city/cuisine/openNow/sort/...).
        // Some CDNs (notably Netlify's) build their shared-cache key from the path only and
        // ignore the query string unless told otherwise, which previously made every filter
        // combination return whatever was cached for the very first request. `no-store` is the
        // only value that's safe by default everywhere; `Netlify-Vary` opts back into caching
        // on Netlify specifically, keyed by the full query string, without regressing other hosts.
        'Cache-Control': 'no-store',
        'Netlify-Vary': 'query',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    });
  } catch (error) {
    console.error("GET /api/businesses error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    const { MAX_BUSINESS_CATEGORIES } = await import("@/lib/plans");
    const isAdminUser = session.user.role === "admin";

    // Every field is validated with the same rules the wizard applies client-side:
    // Persian-only text, Iranian phone numbers, real Instagram handles, map links, etc.
    const { values, errors, valid, firstError } = runValidators({
      name: validateBusinessName(body.name),
      description: validateDescription(body.description),
      categoryIds: validateIdList(body.categoryIds, { min: 1, max: MAX_BUSINESS_CATEGORIES, label: "دسته‌بندی غذایی" }),
      city: validateCity(body.city),
      locationText: validateAddress(body.locationText),
      locationLink: validateMapLink(body.locationLink, false),
      phone: validateBusinessPhone(body.phone, false),
      instagram: validateInstagram(body.instagram, false),
      website: validateWebsite(body.website, false),
      logo: validateImageData(body.logo, { label: "لوگو" }),
      coverImage: validateImageData(body.coverImage, { label: "تصویر کاور" }),
      // Private ownership-verification photo (see schema). Required for truck owners so the
      // admin team can confirm the business is real; admins creating listings can skip it.
      verificationPhoto: validateImageData(body.verificationPhoto, { required: !isAdminUser, label: "عکس احراز هویت" }),
      hours: validateHours(Array.isArray(body.hours) ? body.hours : []),
    });
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    const categoryIds = values.categoryIds;
    const verificationPhoto = values.verificationPhoto && values.verificationPhoto.startsWith("data:image/") ? values.verificationPhoto : null;
    if (!verificationPhoto && !isAdminUser) {
      return NextResponse.json({ error: "عکس فودتراک برای احراز هویت الزامی است" }, { status: 400 });
    }

    // Menu section labels + items + gallery photos submitted during onboarding are validated
    // up-front too, so a single bad item fails the whole request with a clear message instead
    // of being silently dropped.
    const submittedMenuCategories: string[] = [];
    if (Array.isArray(body.menuCategories)) {
      for (const raw of body.menuCategories) {
        const check = validateMenuCategoryName(raw);
        if (failed(check)) return NextResponse.json({ error: check.error, errors: { menuCategories: check.error } }, { status: 400 });
        if (!submittedMenuCategories.includes(check.value)) submittedMenuCategories.push(check.value);
      }
    }

    const submittedMenuItems: { name: string; description: string | null; price: string; image: string | null; category: string | null }[] = [];
    if (Array.isArray(body.menuItems)) {
      for (const raw of body.menuItems) {
        const item = runValidators({
          name: validateMenuItemName(raw?.name),
          description: validateMenuItemDescription(raw?.description),
          price: validatePrice(raw?.price),
          image: validateImageData(raw?.image, { label: "تصویر آیتم منو" }),
        });
        if (!item.valid) return NextResponse.json({ error: `آیتم منو: ${item.firstError}`, errors: { menuItems: item.firstError } }, { status: 400 });
        const category = typeof raw?.category === "string" && raw.category.trim() ? raw.category.trim() : null;
        if (category && !submittedMenuCategories.includes(category)) {
          return NextResponse.json({ error: "دسته انتخاب‌شده برای آیتم منو وجود ندارد" }, { status: 400 });
        }
        submittedMenuItems.push({
          name: item.values.name,
          description: item.values.description || null,
          price: String(item.values.price),
          image: item.values.image,
          category,
        });
      }
    }

    const submittedPhotoUrls: string[] = [];
    if (Array.isArray(body.photos)) {
      for (const raw of body.photos) {
        const check = validateImageData(raw, { required: true, label: "عکس گالری" });
        if (failed(check)) return NextResponse.json({ error: check.error, errors: { photos: check.error } }, { status: 400 });
        if (check.value) submittedPhotoUrls.push(check.value);
      }
    }

    // Enforce plan limits (admins bypass)
    let ownerPhotoLimit = Infinity;
    let ownerMenuItemLimit = Infinity;
    // Contact info (phone number + Instagram) is a pro-only perk — admins bypass this too.
    let allowContactInfo = true;
    if (session.user.role !== "admin") {
      const { PLAN_LIMITS } = await import("@/lib/plans");
      const { enforceExpiredPlan, getOwnerProfile } = await import("@/lib/subscription");
      await enforceExpiredPlan(parseInt(session.user.id));
      const owner = await getOwnerProfile(parseInt(session.user.id));
      const ownerPlan = owner?.plan || "free";
      const myBiz = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, parseInt(session.user.id)));
      if (myBiz.length >= PLAN_LIMITS[ownerPlan].businesses) {
        return NextResponse.json(
          { error: `پلن ${PLAN_LIMITS[ownerPlan].label} اجازه ثبت حداکثر ${PLAN_LIMITS[ownerPlan].businesses} فودتراک را می‌دهد. برای ثبت بیشتر ارتقا دهید.` },
          { status: 403 }
        );
      }
      // Gallery photo limit applies per announcement (per business) — e.g. pro plan owners
      // can upload up to 8 photos per food truck.
      ownerPhotoLimit = PLAN_LIMITS[ownerPlan].photos;
      // Menu item limit also applies per food truck — e.g. pro plan owners can add up to
      // 50 menu items per truck.
      ownerMenuItemLimit = PLAN_LIMITS[ownerPlan].menuItems;
      allowContactInfo = PLAN_LIMITS[ownerPlan].contactInfo;
    }

    // Plan caps on menu items / gallery photos are hard limits, not silent truncation.
    if (submittedMenuItems.length > ownerMenuItemLimit) {
      return NextResponse.json(
        { error: `پلن فعلی شما اجازه حداکثر ${ownerMenuItemLimit} آیتم منو برای هر فودتراک را می‌دهد.` },
        { status: 403 }
      );
    }
    if (submittedPhotoUrls.length > ownerPhotoLimit) {
      return NextResponse.json(
        { error: `پلن فعلی شما اجازه حداکثر ${ownerPhotoLimit} عکس گالری برای هر فودتراک را می‌دهد.` },
        { status: 403 }
      );
    }

    const slug = values.name
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);

    const existing = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    const finalSlug = existing.length ? `${slug}-${Date.now()}` : slug;

    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: parseInt(session.user.id),
        name: values.name,
        slug: finalSlug,
        description: values.description || null,
        truckType: "food",
        logo: values.logo,
        coverImage: values.coverImage,
        city: values.city,
        locationText: values.locationText,
        locationLink: values.locationLink || null,
        phone: allowContactInfo ? values.phone || null : null,
        instagram: allowContactInfo ? values.instagram || null : null,
        website: values.website || null,
        verificationPhoto,
        status: "pending",
      })
      .returning();

    await setBusinessCategories(business.id, categoryIds);

    const weekDays = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;
    for (const day of weekDays) {
      const found = values.hours.find((h) => h.day === day);
      const isFriday = day === "friday";
      const isClosed = found ? found.isClosed : isFriday;
      await db.insert(businessHours).values({
        businessId: business.id,
        day,
        openTime: isClosed ? null : found?.openTime || "11:00",
        closeTime: isClosed ? null : found?.closeTime || "23:00",
        isClosed,
      });
    }

    // Menu categories (section labels) submitted directly during onboarding
    for (let i = 0; i < submittedMenuCategories.length; i++) {
      await db.insert(menuCategories).values({
        businessId: business.id,
        name: submittedMenuCategories[i],
        sortOrder: i,
      });
    }

    // Menu items submitted directly during onboarding
    for (const item of submittedMenuItems) {
      await db.insert(menuItems).values({ businessId: business.id, ...item });
    }

    // Gallery photos submitted directly during onboarding
    for (const url of submittedPhotoUrls) {
      await db.insert(businessPhotos).values({ businessId: business.id, url });
    }

    // Never echo the private verification photo back to the client.
    const { verificationPhoto: _verificationPhoto, ...publicBusiness } = business;
    return NextResponse.json(publicBusiness, { status: 201 });
  } catch (error) {
    console.error("POST /api/businesses error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
