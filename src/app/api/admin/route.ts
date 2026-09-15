import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, avg, count, desc, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { businesses, businessCategories, categories, menuCategories, menuItems, ownerProfiles, reviews, users } from "@/db/schema";
import { fetchCategoriesForBusinesses } from "@/lib/business-categories";
import { invalidateCategoriesCache } from "@/lib/categories-cache";
import { CATEGORY_ICON_OPTIONS, DEFAULT_CATEGORY_COLOR } from "@/lib/category-icons";
import {
  failed,
  runValidators,
  validateEmail,
  validateEnum,
  validateFoodCategoryName,
  validateHexColor,
  validateId,
  validateMobile,
  validateNewPassword,
  validatePersonName,
} from "@/lib/validators";

const CATEGORY_ICON_KEYS = CATEGORY_ICON_OPTIONS.map((o) => o.key);

/** Slug for the English `name` column, derived from the Persian label (kept unique via a suffix). */
function categorySlug(nameFa: string) {
  const base = nameFa
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `category-${Date.now()}`;
}

/** Is `email` / `phone` already used by a *different* user? Returns a field-error map or null. */
async function findCredentialConflicts(email: string, phone: string | null, excludeId?: number) {
  const errors: Record<string, string> = {};
  const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (byEmail && byEmail.id !== excludeId) errors.email = "این ایمیل قبلاً ثبت شده است";
  if (phone) {
    const [byPhone] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (byPhone && byPhone.id !== excludeId) errors.phone = "این شماره موبایل قبلاً ثبت شده است";
  }
  return Object.keys(errors).length ? errors : null;
}

// Four access layers: founder (super admin / website owner) > admin > owner (truck owner) > user.
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "admin" && session.user.role !== "founder")) return null;
  return session;
}

function isFounder(session: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>) {
  return session.user.role === "founder";
}

async function recalculateBusinessRating(businessId: number) {
  const [row] = await db
    .select({ avg: avg(reviews.rating), total: sql<number>`count(*)` })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));

  await db
    .update(businesses)
    .set({
      rating: row?.avg ? String(Number(row.avg).toFixed(1)) : "0",
      reviewCount: Number(row?.total || 0),
      updatedAt: new Date(),
    })
    .where(eq(businesses.id, businessId));
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "stats";

    if (type === "stats") {
      const [businessCount] = await db.select({ count: count() }).from(businesses);
      const [approvedCount] = await db.select({ count: count() }).from(businesses).where(eq(businesses.status, "approved"));
      const [pendingCount] = await db.select({ count: count() }).from(businesses).where(eq(businesses.status, "pending"));
      const [rejectedCount] = await db.select({ count: count() }).from(businesses).where(eq(businesses.status, "rejected"));
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "user"));
      const [ownerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "owner"));
      const [adminCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));
      const [reviewCount] = await db.select({ count: count() }).from(reviews);
      const [categoryCount] = await db.select({ count: count() }).from(categories);
      const [menuCount] = await db.select({ count: count() }).from(menuItems);

      return NextResponse.json({
        stats: {
          businesses: businessCount.count,
          approved: approvedCount.count,
          pending: pendingCount.count,
          rejected: rejectedCount.count,
          users: userCount.count,
          owners: ownerCount.count,
          admins: adminCount.count,
          reviews: reviewCount.count,
          categories: categoryCount.count,
          menuItems: menuCount.count,
        },
      });
    }

    if (type === "users") {
      // Avatar and plan/planExpiresAt only exist for truck owner accounts,
      // via the separate owner_profiles table — null for plain users.
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: ownerProfiles.avatar,
          role: users.role,
          plan: ownerProfiles.plan,
          planExpiresAt: ownerProfiles.planExpiresAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(ownerProfiles, eq(users.id, ownerProfiles.userId))
        .where(sql`${users.role} not in ('admin', 'founder')`)
        .orderBy(desc(users.createdAt));
      return NextResponse.json(result);
    }

    // Manage-admins section: only the founder can see/manage this layer.
    // The founder account itself is intentionally excluded — this section is
    // only for admins the founder has added, not for the founder's own account.
    if (type === "admins") {
      if (!isFounder(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Admins/founder never have an avatar or a subscription plan — those only
      // exist for truck owner accounts.
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, "admin"))
        .orderBy(desc(users.createdAt));
      return NextResponse.json(result);
    }

    if (type === "businesses") {
      const status = searchParams.get("status");
      const condition = status && status !== "all" ? eq(businesses.status, status as any) : sql`1=1`;
      const result = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          slug: businesses.slug,
          description: businesses.description,
          status: businesses.status,
          city: businesses.city,
          locationText: businesses.locationText,
          locationLink: businesses.locationLink,
          phone: businesses.phone,
          instagram: businesses.instagram,
          website: businesses.website,
          logo: businesses.logo,
          coverImage: businesses.coverImage,
          // Admin-only: private ownership-verification photo used to vet the submission.
          verificationPhoto: businesses.verificationPhoto,
          isOpen: businesses.isOpen,
          rating: businesses.rating,
          reviewCount: businesses.reviewCount,
          views: businesses.views,
          createdAt: businesses.createdAt,
          ownerId: businesses.ownerId,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(businesses)
        .leftJoin(users, eq(businesses.ownerId, users.id))
        .where(condition)
        .orderBy(desc(businesses.createdAt));

      const categoriesMap = await fetchCategoriesForBusinesses(result.map((b) => b.id));
      const withCategories = result.map((b) => ({
        ...b,
        categories: categoriesMap[b.id] || [],
        categoryName: categoriesMap[b.id]?.map((c) => c.nameFa).join("، ") || null,
      }));
      return NextResponse.json(withCategories);
    }

    // Global food categories (managed only by admins/founder). Business owners can only pick from these.
    if (type === "categories") {
      const result = await db
        .select({
          id: categories.id,
          name: categories.name,
          nameFa: categories.nameFa,
          icon: categories.icon,
          color: categories.color,
          createdAt: categories.createdAt,
          businessCount: sql<number>`(
            select count(*) from ${businessCategories}
            where ${businessCategories.categoryId} = ${categories.id}
          )`,
        })
        .from(categories)
        .orderBy(categories.nameFa);
      return NextResponse.json(result);
    }

    // Per-business menu section labels (created freely by owners while building their menu).
    // Admins can moderate/remove inappropriate or duplicate ones here.
    if (type === "menuCategories") {
      const result = await db
        .select({
          id: menuCategories.id,
          name: menuCategories.name,
          businessId: menuCategories.businessId,
          businessName: businesses.name,
          businessSlug: businesses.slug,
          ownerName: users.name,
          sortOrder: menuCategories.sortOrder,
          createdAt: menuCategories.createdAt,
          itemCount: sql<number>`(
            select count(*) from ${menuItems}
            where ${menuItems.businessId} = ${menuCategories.businessId}
              and ${menuItems.category} = ${menuCategories.name}
          )`,
        })
        .from(menuCategories)
        .leftJoin(businesses, eq(menuCategories.businessId, businesses.id))
        .leftJoin(users, eq(businesses.ownerId, users.id))
        .orderBy(desc(menuCategories.createdAt));
      return NextResponse.json(result);
    }

    if (type === "reviews") {
      const result = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          businessId: reviews.businessId,
          businessName: businesses.name,
          businessSlug: businesses.slug,
          userId: reviews.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(reviews)
        .leftJoin(businesses, eq(reviews.businessId, businesses.id))
        .leftJoin(users, eq(reviews.userId, users.id))
        .orderBy(desc(reviews.createdAt));
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    if (body.action === "admin") {
      if (!isFounder(session)) {
        return NextResponse.json({ error: "فقط بنیان‌گذار اصلی می‌تواند ادمین جدید ایجاد کند" }, { status: 403 });
      }
      // Every admin needs a Persian full name, a valid unique e-mail, a unique Iranian mobile
      // number (so the founder can always reach them) and a strong password.
      const { values, errors, valid, firstError } = runValidators({
        name: validatePersonName(body.name),
        email: validateEmail(body.email),
        phone: validateMobile(body.phone, true),
        password: validateNewPassword(body.password),
      });
      if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

      const conflicts = await findCredentialConflicts(values.email, values.phone);
      if (conflicts) return NextResponse.json({ error: Object.values(conflicts)[0], errors: conflicts }, { status: 400 });

      const hashedPassword = await bcrypt.hash(values.password, 12);
      const [admin] = await db
        .insert(users)
        .values({
          name: values.name,
          email: values.email,
          password: hashedPassword,
          phone: values.phone,
          role: "admin",
        })
        .returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role });
      return NextResponse.json(admin, { status: 201 });
    }

    // Only admins/founder can create global food categories. Business owners can only select from these.
    if (body.action === "category") {
      const { values, errors, valid, firstError } = runValidators({
        nameFa: validateFoodCategoryName(body.nameFa),
        icon: validateEnum(body.icon || "utensils", CATEGORY_ICON_KEYS, "آیکون دسته‌بندی"),
        color: validateHexColor(body.color || DEFAULT_CATEGORY_COLOR),
      });
      if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

      const existing = await db.select().from(categories).where(eq(categories.nameFa, values.nameFa)).limit(1);
      if (existing.length) {
        return NextResponse.json({ error: "این دسته‌بندی قبلاً ثبت شده است", errors: { nameFa: "این دسته‌بندی قبلاً ثبت شده است" } }, { status: 400 });
      }

      const [category] = await db
        .insert(categories)
        .values({
          name: categorySlug(values.nameFa),
          nameFa: values.nameFa,
          icon: values.icon,
          color: values.color,
        })
        .returning();
      // A new category must show up immediately on the homepage / trucks filters.
      invalidateCategoriesCache();
      return NextResponse.json(category, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    if (body.action === "businessStatus" || (body.id && body.status)) {
      const id = validateId(body.id, "شناسه فودتراک");
      if (failed(id)) return NextResponse.json({ error: id.error }, { status: 400 });
      const statusCheck = validateEnum(body.status, ["pending", "approved", "rejected"] as const, "وضعیت");
      if (failed(statusCheck)) return NextResponse.json({ error: statusCheck.error }, { status: 400 });
      await db.update(businesses).set({ status: statusCheck.value, updatedAt: new Date() }).where(eq(businesses.id, id.value));
      return NextResponse.json({ success: true });
    }

    // Founder-only: edit an admin's profile (name/phone) and optionally reset their password.
    if (body.action === "updateAdmin") {
      if (!isFounder(session)) {
        return NextResponse.json({ error: "فقط بنیان‌گذار اصلی می‌تواند ادمین‌ها را ویرایش کند" }, { status: 403 });
      }
      const idCheck = validateId(body.id, "شناسه ادمین");
      if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
      const [target] = await db.select().from(users).where(eq(users.id, idCheck.value)).limit(1);
      if (!target || (target.role !== "admin" && target.role !== "founder")) {
        return NextResponse.json({ error: "ادمین یافت نشد" }, { status: 404 });
      }
      if (target.role === "founder" && target.id !== Number(session.user.id)) {
        return NextResponse.json({ error: "امکان ویرایش حساب بنیان‌گذار توسط دیگران وجود ندارد" }, { status: 403 });
      }

      // Fields that are omitted keep their current value; anything that *is* sent must be valid.
      // Phone stays mandatory for admins, so an explicit empty string is rejected.
      const { values, errors, valid, firstError } = runValidators({
        name: body.name === undefined ? validatePersonName(target.name) : validatePersonName(body.name),
        email: body.email === undefined ? validateEmail(target.email) : validateEmail(body.email),
        phone: body.phone === undefined ? validateMobile(target.phone ?? "", true) : validateMobile(body.phone, true),
        password: validateNewPassword(body.password, false, "رمز عبور جدید"),
      });
      if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

      const conflicts = await findCredentialConflicts(values.email, values.phone, target.id);
      if (conflicts) return NextResponse.json({ error: Object.values(conflicts)[0], errors: conflicts }, { status: 400 });

      const updateData: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        updatedAt: new Date(),
      };
      if (values.password) {
        updateData.password = await bcrypt.hash(values.password, 12);
      }

      await db.update(users).set(updateData).where(eq(users.id, target.id));
      return NextResponse.json({ success: true });
    }

    if (body.action === "userRole") {
      const roleCheck = validateEnum(body.role, ["user", "owner", "admin", "founder"] as const, "نقش");
      if (failed(roleCheck)) return NextResponse.json({ error: roleCheck.error }, { status: 400 });
      const idCheck = validateId(body.id, "شناسه کاربر");
      if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
      if (Number(body.id) === Number(session.user.id) && body.role !== session.user.role) {
        return NextResponse.json({ error: "نمی‌توانید نقش خودتان را حذف کنید" }, { status: 400 });
      }
      const [targetUser] = await db.select().from(users).where(eq(users.id, Number(body.id))).limit(1);
      if (!targetUser) {
        return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
      }
      const touchingAdminAccount = targetUser.role === "admin" || targetUser.role === "founder" || body.role === "admin";
      if (touchingAdminAccount && !isFounder(session)) {
        return NextResponse.json({ error: "فقط بنیان‌گذار اصلی می‌تواند حساب‌های ادمین را مدیریت کند" }, { status: 403 });
      }
      if (targetUser.role === "founder") {
        return NextResponse.json({ error: "نقش بنیان‌گذار قابل تغییر نیست" }, { status: 403 });
      }
      if (body.role === "founder") {
        return NextResponse.json({ error: "امکان تخصیص نقش بنیان‌گذار وجود ندارد" }, { status: 403 });
      }
      await db.update(users).set({ role: body.role, updatedAt: new Date() }).where(eq(users.id, Number(body.id)));
      // Promoting someone to "owner" gives them an owner_profiles row (free
      // plan, no avatar yet) right away, since only owners have one.
      if (body.role === "owner") {
        await db.insert(ownerProfiles).values({ userId: targetUser.id }).onConflictDoNothing();
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === "userPlan") {
      const plan = body.plan as "free" | "pro";
      if (!["free", "pro"].includes(plan)) {
        return NextResponse.json({ error: "پلن نامعتبر" }, { status: 400 });
      }
      const planIdCheck = validateId(body.id, "شناسه کاربر");
      if (failed(planIdCheck)) return NextResponse.json({ error: planIdCheck.error }, { status: 400 });
      const [targetUser] = await db.select().from(users).where(eq(users.id, Number(body.id))).limit(1);
      if (!targetUser) {
        return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
      }
      // Only truck owner accounts can subscribe to the pro plan — regular users have no plan.
      if (targetUser.role !== "owner") {
        return NextResponse.json({ error: "تنها مالکان فودتراک می‌توانند پلن داشته باشند" }, { status: 400 });
      }
      const expiresAt = plan === "free" ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await db
        .insert(ownerProfiles)
        .values({ userId: targetUser.id, plan, planExpiresAt: expiresAt })
        .onConflictDoUpdate({ target: ownerProfiles.userId, set: { plan, planExpiresAt: expiresAt, updatedAt: new Date() } });
      return NextResponse.json({ success: true });
    }

    if (body.action === "category") {
      const idCheck = validateId(body.id, "شناسه دسته");
      if (failed(idCheck)) return NextResponse.json({ error: idCheck.error }, { status: 400 });
      const [existingCategory] = await db.select().from(categories).where(eq(categories.id, idCheck.value)).limit(1);
      if (!existingCategory) return NextResponse.json({ error: "دسته یافت نشد" }, { status: 404 });

      const { values, errors, valid, firstError } = runValidators({
        nameFa: validateFoodCategoryName(body.nameFa ?? existingCategory.nameFa),
        icon: validateEnum(body.icon || existingCategory.icon || "utensils", CATEGORY_ICON_KEYS, "آیکون دسته‌بندی"),
        color: validateHexColor(body.color || existingCategory.color || DEFAULT_CATEGORY_COLOR),
      });
      if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

      if (values.nameFa !== existingCategory.nameFa) {
        const [dup] = await db.select({ id: categories.id }).from(categories).where(eq(categories.nameFa, values.nameFa)).limit(1);
        if (dup && dup.id !== existingCategory.id) {
          return NextResponse.json({ error: "این دسته‌بندی قبلاً ثبت شده است", errors: { nameFa: "این دسته‌بندی قبلاً ثبت شده است" } }, { status: 400 });
        }
      }

      await db
        .update(categories)
        .set({
          nameFa: values.nameFa,
          name: values.nameFa !== existingCategory.nameFa ? categorySlug(values.nameFa) : existingCategory.name,
          icon: values.icon,
          color: values.color,
        })
        .where(eq(categories.id, idCheck.value));
      invalidateCategoriesCache();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = Number(searchParams.get("id"));
    if (!type || !id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    if (type === "business") {
      await db.delete(businesses).where(eq(businesses.id, id));
      return NextResponse.json({ success: true });
    }

    if (type === "review") {
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
      if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.delete(reviews).where(eq(reviews.id, id));
      await recalculateBusinessRating(review.businessId);
      return NextResponse.json({ success: true });
    }

    if (type === "menuCategory") {
      const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, id)).limit(1);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db
        .update(menuItems)
        .set({ category: null })
        .where(and(eq(menuItems.businessId, category.businessId), eq(menuItems.category, category.name)));
      await db.delete(menuCategories).where(eq(menuCategories.id, id));
      return NextResponse.json({ success: true });
    }

    // Deleting a global food category (admin/founder only). Businesses simply lose that tag.
    if (type === "category") {
      const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await db.delete(businessCategories).where(eq(businessCategories.categoryId, id));
      await db.delete(categories).where(eq(categories.id, id));
      invalidateCategoriesCache();
      return NextResponse.json({ success: true });
    }

    if (type === "user") {
      if (id === Number(session.user.id)) {
        return NextResponse.json({ error: "نمی‌توانید حساب خودتان را حذف کنید" }, { status: 400 });
      }
      const [targetUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (targetUser.role === "founder") {
        return NextResponse.json({ error: "شما دسترسی حذف بنیان‌گذار اصلی را ندارید" }, { status: 403 });
      }
      if (targetUser.role === "admin" && !isFounder(session)) {
        return NextResponse.json({ error: "فقط بنیان‌گذار اصلی می‌تواند ادمین‌ها را حذف کند" }, { status: 403 });
      }
      await db.delete(users).where(eq(users.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
