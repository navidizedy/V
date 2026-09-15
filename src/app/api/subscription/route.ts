import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { ownerProfiles, businesses, menuItems, businessPhotos } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import {
  RENEWAL_WINDOW_DAYS,
  enforceExpiredPlan,
  getDaysRemaining,
  getOwnerProfile,
  isWithinRenewalWindow,
} from "@/lib/subscription";

// Only truck owner accounts have a subscription plan at all — regular users,
// admins and the founder never do.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "owner") {
      return NextResponse.json({ error: "فقط مالکان فودتراک اشتراک دارند" }, { status: 403 });
    }

    const userId = parseInt(session.user.id);

    // Auto-downgrade to free (and trim data to the free plan's limits) if the
    // paid plan has expired since the owner last checked.
    await enforceExpiredPlan(userId);

    const user = await getOwnerProfile(userId);
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const currentPlan = user.plan;

    // Usage stats
    const myBusinesses = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerId, userId));

    let totalMenuItems = 0;
    let totalPhotos = 0;
    for (const b of myBusinesses) {
      const [mc] = await db.select({ count: count() }).from(menuItems).where(eq(menuItems.businessId, b.id));
      const [pc] = await db.select({ count: count() }).from(businessPhotos).where(eq(businessPhotos.businessId, b.id));
      totalMenuItems += mc.count;
      totalPhotos += pc.count;
    }

    const limits = PLAN_LIMITS[currentPlan];
    // Photo gallery and menu item limits are per business (e.g. 8 photos and 50 menu items
    // per truck on the pro plan), so the total quota shown in "میزان مصرف" is the per-business
    // allowance times the max number of businesses the plan allows.
    const totalPhotoLimit = limits.photos * limits.businesses;
    const totalMenuItemLimit = limits.menuItems * limits.businesses;

    const planExpiresAt = currentPlan === "free" ? null : user.planExpiresAt;
    const daysRemaining = getDaysRemaining(planExpiresAt);

    return NextResponse.json({
      plan: currentPlan,
      planLabel: limits.label,
      planExpiresAt,
      daysRemaining,
      renewalWindowDays: RENEWAL_WINDOW_DAYS,
      // Owners see the countdown turn into a red warning once this is true (<= 7 days left).
      isExpiringSoon: currentPlan !== "free" && daysRemaining !== null && daysRemaining <= RENEWAL_WINDOW_DAYS,
      canRenew: currentPlan === "free" || isWithinRenewalWindow(planExpiresAt),
      limits: {
        businesses: limits.businesses,
        menuItems: totalMenuItemLimit,
        photos: totalPhotoLimit,
      },
      usage: {
        businesses: myBusinesses.length,
        menuItems: totalMenuItems,
        photos: totalPhotos,
      },
    });
  } catch (error) {
    console.error("GET /api/subscription error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "owner") {
      return NextResponse.json({ error: "فقط مالکان فودتراک می‌توانند اشتراک تهیه کنند" }, { status: 403 });
    }

    const body = await req.json();
    const targetPlan = body.plan as "free" | "pro";

    if (!["free", "pro"].includes(targetPlan)) {
      return NextResponse.json({ error: "پلن نامعتبر است" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // Make sure an already-expired plan (and its data trimming) is applied
    // before evaluating whether a purchase/renewal is allowed.
    await enforceExpiredPlan(userId);

    if (targetPlan === "free") {
      await db
        .update(ownerProfiles)
        .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
        .where(eq(ownerProfiles.userId, userId));
      return NextResponse.json({ success: true, plan: "free" });
    }

    // Owners can buy/renew a subscription once they're on the free plan, once
    // their previous plan has expired, or once they're within the last 7 days
    // of their currently active plan — otherwise they must wait for the
    // renewal window to open.
    const current = await getOwnerProfile(userId);

    if (current?.plan === "pro" && current.planExpiresAt && !isWithinRenewalWindow(current.planExpiresAt)) {
      const daysRemaining = getDaysRemaining(current.planExpiresAt);
      return NextResponse.json(
        {
          error: `شما در حال حاضر اشتراک فعال دارید. تمدید از ${RENEWAL_WINDOW_DAYS} روز قبل از پایان اعتبار امکان‌پذیر است (${daysRemaining} روز تا آن باقی مانده).`,
          planExpiresAt: current.planExpiresAt,
          daysRemaining,
        },
        { status: 409 },
      );
    }

    // Renewing while still active extends the *current* expiry date by 30 days
    // instead of resetting the clock from "now", so early renewals aren't wasted.
    const base =
      current?.plan === "pro" && current.planExpiresAt && new Date(current.planExpiresAt) > new Date()
        ? new Date(current.planExpiresAt)
        : new Date();
    const expiresAt = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(ownerProfiles)
      .set({ plan: "pro", planExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(ownerProfiles.userId, userId));

    return NextResponse.json({ success: true, plan: "pro", planExpiresAt: expiresAt });
  } catch (error) {
    console.error("POST /api/subscription error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
