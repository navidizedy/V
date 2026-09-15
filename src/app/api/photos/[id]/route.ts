import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessPhotos, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const photo = await db.select().from(businessPhotos).where(eq(businessPhotos.id, parseInt(id))).limit(1);
    if (!photo.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const business = await db.select().from(businesses).where(eq(businesses.id, photo[0].businessId)).limit(1);
    if (!business.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (business[0].ownerId !== parseInt(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(businessPhotos).where(eq(businessPhotos.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/photos/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
