import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessHours, businesses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { failed, validateHours } from "@/lib/validators";

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

    const body = await req.json().catch(() => null);
    // Every open day must carry a valid, non-identical HH:MM open/close pair.
    const check = validateHours(body?.hours);
    if (failed(check)) return NextResponse.json({ error: check.error, errors: { hours: check.error } }, { status: 400 });

    for (const h of check.value) {
      if (h.id) {
        // Only rows that belong to this business can be touched.
        await db
          .update(businessHours)
          .set({ openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })
          .where(and(eq(businessHours.id, h.id), eq(businessHours.businessId, business[0].id)));
      } else {
        const [existingRow] = await db
          .select({ id: businessHours.id })
          .from(businessHours)
          .where(and(eq(businessHours.businessId, business[0].id), eq(businessHours.day, h.day)))
          .limit(1);
        if (existingRow) {
          await db
            .update(businessHours)
            .set({ openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed })
            .where(eq(businessHours.id, existingRow.id));
        } else {
          await db.insert(businessHours).values({
            businessId: business[0].id,
            day: h.day,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH hours error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
