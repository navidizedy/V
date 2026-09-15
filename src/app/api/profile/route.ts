import { NextRequest, NextResponse } from "next/server";
import { toPublicImageUrl, isProxiedImageUrl } from "@/lib/image-url";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, ownerProfiles } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import {
  runValidators,
  validateEmail,
  validateExistingPassword,
  validateImageData,
  validateMobile,
  validateNewPassword,
  validatePersonName,
  type FieldResult,
} from "@/lib/validators";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
        // Avatar only exists for truck owner accounts — null for everyone else.
        avatar: ownerProfiles.avatar,
        avatarUpdatedAt: ownerProfiles.updatedAt,
      })
      .from(users)
      .leftJoin(ownerProfiles, eq(users.id, ownerProfiles.userId))
      .where(eq(users.id, parseInt(session.user.id)))
      .limit(1);

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { avatarUpdatedAt, ...rest } = user;
    // Send a small cacheable URL instead of the raw base64 avatar (the navbar fetches
    // this on every page load for owners and even stores it in sessionStorage).
    return NextResponse.json({ ...rest, avatar: toPublicImageUrl("avatar", user.id, user.avatar, avatarUpdatedAt) });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }
    const userId = parseInt(session.user.id);

    if (body.action === "password") {
      const { values, errors, valid, firstError } = runValidators({
        currentPassword: validateExistingPassword(body.currentPassword, "رمز عبور فعلی"),
        newPassword: validateNewPassword(body.newPassword, true, "رمز عبور جدید"),
      });
      if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });
      if (values.currentPassword === values.newPassword) {
        return NextResponse.json(
          { error: "رمز عبور جدید باید با رمز فعلی متفاوت باشد", errors: { newPassword: "رمز عبور جدید باید با رمز فعلی متفاوت باشد" } },
          { status: 400 }
        );
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const isValid = await bcrypt.compare(values.currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "رمز فعلی اشتباه است", errors: { currentPassword: "رمز فعلی اشتباه است" } }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(values.newPassword, 12);
      await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.id, userId));
      return NextResponse.json({ success: true });
    }

    // Only truck owner accounts have an avatar at all.
    const [currentUser] = await db
      .select({ role: users.role, email: users.email, name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!currentUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isOwner = currentUser.role === "owner";

    // Persian-only full name, strict e-mail and a mandatory Iranian mobile number — the same
    // rules that applied at sign-up, so a profile edit can never weaken the account data.
    const { values, errors, valid, firstError } = runValidators({
      name: validatePersonName(body.name ?? currentUser.name),
      email: validateEmail(body.email ?? currentUser.email),
      phone: validateMobile(body.phone ?? currentUser.phone ?? "", true),
      avatar: isOwner
        ? validateImageData(body.avatar, { label: "تصویر پروفایل" })
        : ({ value: null, error: null } as FieldResult<string | null>),
    });
    if (!valid) return NextResponse.json({ error: firstError, errors }, { status: 400 });

    // A proxied `/api/images/avatar/...` URL means the avatar was not changed — keep the stored one.
    const avatarUnchanged = isProxiedImageUrl(body.avatar);
    const avatar = isOwner && values.avatar && !avatarUnchanged ? values.avatar : null;
    const { name, email, phone } = values;

    // E-mail / phone must stay unique across accounts.
    if (email !== currentUser.email) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) {
        return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است", errors: { email: "این ایمیل قبلاً ثبت شده است" } }, { status: 400 });
      }
    }
    if (phone !== currentUser.phone) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
      if (existing && existing.id !== userId) {
        return NextResponse.json(
          { error: "این شماره موبایل قبلاً ثبت شده است", errors: { phone: "این شماره موبایل قبلاً ثبت شده است" } },
          { status: 400 }
        );
      }
    }

    const updateData: { name: string; phone: string; email?: string; updatedAt: Date } = { name, phone, updatedAt: new Date() };
    if (email !== currentUser.email) {
      updateData.email = email;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      });

    let responseAvatar: string | null = null;
    if (isOwner) {
      const now = new Date();
      const [ownerProfile] = await db
        .insert(ownerProfiles)
        .values({ userId, avatar })
        .onConflictDoUpdate({
          target: ownerProfiles.userId,
          set: avatarUnchanged ? { updatedAt: now } : { avatar, updatedAt: now },
        })
        .returning({ avatar: ownerProfiles.avatar, updatedAt: ownerProfiles.updatedAt });
      responseAvatar = toPublicImageUrl("avatar", userId, ownerProfile?.avatar ?? null, ownerProfile?.updatedAt);
    }

    return NextResponse.json({ ...updated, avatar: responseAvatar });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// Users and business owners can permanently delete their own account.
// Requires the current password for confirmation. The founder account
// (role === "founder") cannot be deleted through this endpoint.
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.role === "founder") {
      return NextResponse.json({ error: "حساب بنیان‌گذار قابل حذف نیست" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const password = String(body.password || "");
    if (!password) {
      return NextResponse.json({ error: "برای حذف حساب، رمز عبور خود را وارد کنید" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "رمز عبور اشتباه است" }, { status: 400 });
    }

    // Deleting the user cascades to their businesses, owner profile, reviews,
    // favorites and notifications thanks to the "onDelete: cascade" foreign keys.
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profile error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
