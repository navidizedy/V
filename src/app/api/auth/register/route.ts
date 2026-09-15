import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, ownerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { rateLimitPresets } from "@/lib/rate-limit";
import {
  runValidators,
  validateEmail,
  validateMobile,
  validateNewPassword,
  validatePersonName,
} from "@/lib/validators";

export async function POST(req: NextRequest) {
  // Rate limiting for registration to prevent abuse
  const rateLimitResult = rateLimitPresets.auth(req);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "تلاش‌های بیش از حد. لطفاً بعداً امتحان کنید." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    const finalRole = body.role === "owner" ? "owner" : "user";

    // Same rules as the sign-up form — Persian-only name, strict e-mail, Iranian mobile,
    // and a password with at least 8 chars including a letter and a digit.
    const { values, errors, valid, firstError } = runValidators({
      name: validatePersonName(body.name),
      email: validateEmail(body.email),
      phone: validateMobile(body.phone, true),
      password: validateNewPassword(body.password),
    });
    if (!valid) {
      return NextResponse.json({ error: firstError, errors }, { status: 400 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, values.email)).limit(1);
    if (existing.length) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است", errors: { email: "این ایمیل قبلاً ثبت شده است" } }, { status: 400 });
    }

    const phoneTaken = await db.select({ id: users.id }).from(users).where(eq(users.phone, values.phone)).limit(1);
    if (phoneTaken.length) {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً ثبت شده است", errors: { phone: "این شماره موبایل قبلاً ثبت شده است" } },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(values.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        name: values.name,
        email: values.email,
        password: hashedPassword,
        phone: values.phone,
        role: finalRole,
      })
      .returning();

    // Truck owner accounts get their own owner_profiles row (avatar + free
    // plan by default) right away — regular users never need one.
    if (finalRole === "owner") {
      await db.insert(ownerProfiles).values({ userId: user.id }).onConflictDoNothing();
    }

    return NextResponse.json(
      { id: user.id, name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
