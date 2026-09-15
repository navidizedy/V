import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { businesses, menuCategories } from "@/db/schema";
import { failed, validateId, validateMenuCategoryName } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = Number(searchParams.get("businessId"));
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    const rows = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.businessId, businessId))
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.id));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/menu-categories error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    const idCheck = validateId(body.businessId, "شناسه فودتراک");
    if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
    const businessId = idCheck.value;
    const nameCheck = validateMenuCategoryName(body.name);
    if (failed(nameCheck)) return NextResponse.json({ error: nameCheck.error, errors: { name: nameCheck.error } }, { status: 400 });
    const name = nameCheck.value;
    if (body.sortOrder !== undefined && (!Number.isInteger(Number(body.sortOrder)) || Number(body.sortOrder) < 0)) {
      return NextResponse.json({ error: "ترتیب نمایش نامعتبر است" }, { status: 400 });
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!business) return NextResponse.json({ error: "فودتراک یافت نشد" }, { status: 404 });
    if (business.ownerId !== Number(session.user.id) && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await db
      .select()
      .from(menuCategories)
      .where(and(eq(menuCategories.businessId, businessId), eq(menuCategories.name, name)));
    if (existing.length) {
      return NextResponse.json({ error: "این دسته‌بندی قبلاً ثبت شده است" }, { status: 400 });
    }

    const [last] = await db
      .select({ sortOrder: menuCategories.sortOrder })
      .from(menuCategories)
      .where(eq(menuCategories.businessId, businessId))
      .orderBy(desc(menuCategories.sortOrder));

    const [row] = await db
      .insert(menuCategories)
      .values({
        businessId,
        name,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : (last?.sortOrder ?? -1) + 1,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("POST /api/menu-categories error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
