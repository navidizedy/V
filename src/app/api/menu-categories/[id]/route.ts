import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { businesses, menuCategories, menuItems } from "@/db/schema";
import { failed, validateMenuCategoryName } from "@/lib/validators";

async function getOwnedCategory(id: number, userId: number, role: string) {
  const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, id)).limit(1);
  if (!category) return { category: null, business: null };
  const [business] = await db.select().from(businesses).where(eq(businesses.id, category.businessId)).limit(1);
  if (!business) return { category: null, business: null };
  if (business.ownerId !== userId && role !== "admin") return { category, business: null };
  return { category, business };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const categoryId = Number(id);

    const { category, business } = await getOwnedCategory(categoryId, Number(session.user.id), session.user.role);
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    // Renaming must satisfy the Persian-only rule and stay unique within this truck's menu.
    let nextName = category.name;
    if (body.name !== undefined) {
      const nameCheck = validateMenuCategoryName(body.name);
      if (failed(nameCheck)) return NextResponse.json({ error: nameCheck.error, errors: { name: nameCheck.error } }, { status: 400 });
      nextName = nameCheck.value;
      if (nextName !== category.name) {
        const [dup] = await db
          .select({ id: menuCategories.id })
          .from(menuCategories)
          .where(and(eq(menuCategories.businessId, category.businessId), eq(menuCategories.name, nextName)))
          .limit(1);
        if (dup) return NextResponse.json({ error: "این دسته‌بندی قبلاً ثبت شده است", errors: { name: "این دسته‌بندی قبلاً ثبت شده است" } }, { status: 400 });
      }
    }
    if (body.sortOrder !== undefined && (!Number.isInteger(Number(body.sortOrder)) || Number(body.sortOrder) < 0)) {
      return NextResponse.json({ error: "ترتیب نمایش نامعتبر است" }, { status: 400 });
    }

    await db
      .update(menuCategories)
      .set({
        name: nextName,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : category.sortOrder,
      })
      .where(eq(menuCategories.id, categoryId));

    if (nextName !== category.name) {
      await db
        .update(menuItems)
        .set({ category: nextName })
        .where(and(eq(menuItems.businessId, category.businessId), eq(menuItems.category, category.name)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/menu-categories/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const categoryId = Number(id);

    const { category, business } = await getOwnedCategory(categoryId, Number(session.user.id), session.user.role);
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Null menu item categories that referenced this name
    await db
      .update(menuItems)
      .set({ category: null })
      .where(and(eq(menuItems.businessId, category.businessId), eq(menuItems.category, category.name)));

    await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/menu-categories/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
