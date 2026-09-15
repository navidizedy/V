import { NextRequest, NextResponse } from "next/server";
import { isProxiedImageUrl } from "@/lib/image-url";
import { db } from "@/db";
import { menuItems, businesses, menuCategories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  runValidators,
  validateImageData,
  validateMenuItemDescription,
  validateMenuItemName,
  validatePrice,
  type FieldResult,
} from "@/lib/validators";

async function checkOwnership(menuItemId: number, userId: string, role: string) {
  const item = await db.select().from(menuItems).where(eq(menuItems.id, menuItemId)).limit(1);
  if (!item.length) return null;
  const business = await db.select().from(businesses).where(eq(businesses.id, item[0].businessId)).limit(1);
  if (!business.length) return null;
  if (business[0].ownerId !== parseInt(userId) && role !== "admin") return false;
  return item[0];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownership = await checkOwnership(parseInt(id), session.user.id, session.user.role);
    if (ownership === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ownership === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    // Partial update — every field that is present must pass the same rules as on creation.
    const checks: Record<string, FieldResult<unknown>> = {};
    if (body.name !== undefined) checks.name = validateMenuItemName(body.name);
    if (body.description !== undefined) checks.description = validateMenuItemDescription(body.description);
    if (body.price !== undefined) checks.price = validatePrice(body.price);
    if (body.image !== undefined) checks.image = validateImageData(body.image, { label: "تصویر آیتم منو" });
    const { values, errors, valid, firstError } = runValidators(checks);
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });
    const v = values as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if ("name" in v) updateData.name = v.name;
    if ("description" in v) updateData.description = (v.description as string) || null;
    if ("price" in v) updateData.price = String(v.price);
    if ("image" in v && !isProxiedImageUrl(body.image)) updateData.image = v.image;
    if (body.category !== undefined) {
      if (body.category === null || body.category === "") {
        updateData.category = null;
      } else if (typeof body.category === "string") {
        const [cat] = await db
          .select({ name: menuCategories.name })
          .from(menuCategories)
          .where(and(eq(menuCategories.businessId, ownership.businessId), eq(menuCategories.name, body.category.trim())))
          .limit(1);
        if (!cat) return NextResponse.json({ error: "دسته انتخاب‌شده وجود ندارد", errors: { category: "دسته انتخاب‌شده وجود ندارد" } }, { status: 400 });
        updateData.category = cat.name;
      } else {
        return NextResponse.json({ error: "دسته نامعتبر است" }, { status: 400 });
      }
    }
    if (body.isAvailable !== undefined) {
      if (typeof body.isAvailable !== "boolean") return NextResponse.json({ error: "وضعیت موجودی نامعتبر است" }, { status: 400 });
      updateData.isAvailable = body.isAvailable;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "هیچ تغییری ارسال نشده است" }, { status: 400 });
    }

    await db.update(menuItems).set(updateData).where(eq(menuItems.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/menu/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ownership = await checkOwnership(parseInt(id), session.user.id, session.user.role);
    if (ownership === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (ownership === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.delete(menuItems).where(eq(menuItems.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/menu/[id] error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
