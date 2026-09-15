import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, businesses } from "@/db/schema";
import { eq, avg, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateId, failed } from "@/lib/validators";

async function recalculateBusinessRating(businessId: number) {
  const avgResult = await db
    .select({ avg: avg(reviews.rating), count: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));

  await db
    .update(businesses)
    .set({
      rating: avgResult[0].avg || "0",
      reviewCount: Number(avgResult[0].count) || 0,
    })
    .where(eq(businesses.id, businessId));
}

/**
 * DELETE /api/reviews/:id
 * A user may delete their own review. Admins may delete any review.
 * The business's aggregate rating/review count is recalculated afterwards.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const idResult = validateId(id, "شناسه نظر");
    if (failed(idResult)) return NextResponse.json({ error: idResult.error }, { status: 400 });
    const reviewId = idResult.value;

    const [review] = await db
      .select({ id: reviews.id, userId: reviews.userId, businessId: reviews.businessId })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review) return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });

    const userId = parseInt(session.user.id);
    const isOwner = review.userId === userId;
    const isAdmin = session.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "شما فقط می‌توانید نظر خودتان را حذف کنید" }, { status: 403 });
    }

    await db.delete(reviews).where(eq(reviews.id, reviewId));
    await recalculateBusinessRating(review.businessId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/reviews/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
