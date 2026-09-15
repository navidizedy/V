import { NextRequest, NextResponse } from "next/server";
import { toPublicImageUrl } from "@/lib/image-url";
import { db } from "@/db";
import { menuItems, businesses, menuCategories } from "@/db/schema";
import { PLAN_LIMITS } from "@/lib/plans";
import { and, eq, desc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  failed,
  runValidators,
  validateId,
  validateImageData,
  validateMenuItemDescription,
  validateMenuItemName,
  validatePrice,
} from "@/lib/validators";

// Results depend on the `businessId` query param — see the note in api/businesses/route.ts for
// why this must be force-dynamic + Netlify-Vary instead of a plain public Cache-Control.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.businessId, parseInt(businessId)))
      .orderBy(desc(menuItems.createdAt));

    // Proxy base64 images through /api/images (small JSON + optimisable thumbnails).
    return NextResponse.json(
      items.map((item) => ({
        ...item,
        // menu_items has no updatedAt, so include the payload length in the version
        // key — it changes whenever the image is replaced, busting the immutable cache.
        image: toPublicImageUrl("menu-item", item.id, item.image, `${item.createdAt.getTime()}-${item.image?.length ?? 0}`),
      })),
      { headers: { "Cache-Control": "no-store", "Netlify-Vary": "query" } }
    );
  } catch (error) {
    console.error("GET /api/menu error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    const businessIdCheck = validateId(body.businessId, "شناسه فودتراک");
    if (failed(businessIdCheck)) return NextResponse.json({ error: businessIdCheck.error }, { status: 400 });
    const businessId = businessIdCheck.value;

    const business = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!business.length) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    if (business[0].ownerId !== parseInt(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Persian-only name/description, positive whole-number price, optional image.
    const { values, errors, valid, firstError } = runValidators({
      name: validateMenuItemName(body.name),
      description: validateMenuItemDescription(body.description),
      price: validatePrice(body.price),
      image: validateImageData(body.image, { label: "تصویر آیتم منو" }),
    });
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    // The section label must be one of this truck's own menu categories.
    let category: string | null = null;
    if (typeof body.category === "string" && body.category.trim()) {
      const [cat] = await db
        .select({ name: menuCategories.name })
        .from(menuCategories)
        .where(and(eq(menuCategories.businessId, businessId), eq(menuCategories.name, body.category.trim())))
        .limit(1);
      if (!cat) return NextResponse.json({ error: "دسته انتخاب‌شده وجود ندارد", errors: { category: "دسته انتخاب‌شده وجود ندارد" } }, { status: 400 });
      category = cat.name;
    }
    if (body.isAvailable !== undefined && typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ error: "وضعیت موجودی نامعتبر است" }, { status: 400 });
    }

    if (session.user.role !== "admin") {
      const { enforceExpiredPlan, getOwnerProfile } = await import("@/lib/subscription");
      await enforceExpiredPlan(parseInt(session.user.id));
      const owner = await getOwnerProfile(parseInt(session.user.id));
      const ownerPlan = owner?.plan || "free";
      // Menu item limit applies per food truck (per business), not across all of the
      // owner's trucks — e.g. pro plan owners can add up to 50 menu items per truck.
      const itemsForThisBusiness = await db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.businessId, businessId));
      if (itemsForThisBusiness.length >= PLAN_LIMITS[ownerPlan].menuItems) {
        return NextResponse.json({ error: `پلن ${PLAN_LIMITS[ownerPlan].label} شما اجازه ${PLAN_LIMITS[ownerPlan].menuItems} آیتم منو برای هر فودتراک را می‌دهد.` }, { status: 403 });
      }
    }

    const [item] = await db
      .insert(menuItems)
      .values({
        businessId,
        name: values.name,
        description: values.description || null,
        price: String(values.price),
        image: values.image,
        category,
        isAvailable: body.isAvailable ?? true,
      })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/menu error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
