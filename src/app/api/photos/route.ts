import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessPhotos, businesses } from "@/db/schema";
import { failed, runValidators, validateId, validateImageData, validatePhotoCaption } from "@/lib/validators";
import { PLAN_LIMITS } from "@/lib/plans";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    const idCheck = validateId(body.businessId, "شناسه فودتراک");
    if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
    const businessId = idCheck.value;

    // Gallery photo must be a real image data-URL; caption (if any) is Persian-only.
    const { values, errors, valid, firstError } = runValidators({
      url: validateImageData(body.url, { required: true, label: "عکس گالری" }),
      caption: validatePhotoCaption(body.caption),
    });
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    const business = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!business.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (business[0].ownerId !== parseInt(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role !== "admin") {
      const { enforceExpiredPlan, getOwnerProfile } = await import("@/lib/subscription");
      await enforceExpiredPlan(parseInt(session.user.id));
      const owner = await getOwnerProfile(parseInt(session.user.id));
      const ownerPlan = owner?.plan || "free";
      // Gallery photo limit applies per announcement (per business), not across all of the
      // owner's businesses — e.g. pro plan owners can upload up to 8 photos per food truck.
      const photosForThisBusiness = await db
        .select({ id: businessPhotos.id })
        .from(businessPhotos)
        .where(eq(businessPhotos.businessId, businessId));
      if (photosForThisBusiness.length >= PLAN_LIMITS[ownerPlan].photos) {
        return NextResponse.json({ error: `پلن ${PLAN_LIMITS[ownerPlan].label} شما اجازه ${PLAN_LIMITS[ownerPlan].photos} عکس گالری برای هر فودتراک را می‌دهد.` }, { status: 403 });
      }
    }

    const [photo] = await db
      .insert(businessPhotos)
      .values({
        businessId,
        url: values.url as string,
        caption: values.caption || null,
      })
      .returning();

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("POST /api/photos error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
