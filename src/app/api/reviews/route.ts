import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, businesses } from "@/db/schema";
import { eq, avg, sql, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runValidators, validateId, validateRating, validateReviewComment } from "@/lib/validators";

async function recalculateBusinessRating(businessId: number) {
  const avgResult = await db
    .select({ avg: avg(reviews.rating), count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));

  await db
    .update(businesses)
    .set({
      rating: avgResult[0].avg || "0",
      reviewCount: avgResult[0].count || 0,
    })
    .where(eq(businesses.id, businessId));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    const userId = parseInt(session.user.id);

    // Integer rating 1–5 and an optional Persian-only comment (max 500 chars).
    const { values, errors, valid, firstError } = runValidators({
      businessId: validateId(body.businessId, "شناسه فودتراک"),
      rating: validateRating(body.rating),
      comment: validateReviewComment(body.comment),
    });
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });
    const businessId = values.businessId;

    const [target] = await db.select({ id: businesses.id, ownerId: businesses.ownerId, status: businesses.status }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!target) return NextResponse.json({ error: "فودتراک یافت نشد" }, { status: 404 });
    if (target.status !== "approved") return NextResponse.json({ error: "فقط برای فودتراک‌های تاییدشده می‌توان نظر ثبت کرد" }, { status: 400 });
    if (target.ownerId === userId) return NextResponse.json({ error: "نمی‌توانید برای فودتراک خودتان نظر ثبت کنید" }, { status: 400 });

    // A user may only leave one review per business.
    const existing = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.businessId, businessId), eq(reviews.userId, userId)))
      .limit(1);

    if (existing.length) {
      return NextResponse.json(
        { error: "شما قبلاً برای این کسب‌وکار نظر ثبت کرده‌اید.", review: existing[0] },
        { status: 409 }
      );
    }

    let review;
    try {
      [review] = await db
        .insert(reviews)
        .values({
          businessId,
          userId,
          rating: values.rating,
          comment: values.comment || null,
        })
        .returning();
    } catch (err: unknown) {
      // Guard against a race condition where two requests slip past the check above.
      if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "شما قبلاً برای این کسب‌وکار نظر ثبت کرده‌اید." },
          { status: 409 }
        );
      }
      throw err;
    }

    await recalculateBusinessRating(businessId);

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// Reviews cannot be edited after submission — each user may only leave a single,
// permanent review per business (see the POST handler above).
