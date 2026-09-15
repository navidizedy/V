import { NextResponse } from "next/server";
import { count, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";

export async function GET() {
  try {
    // Count approved businesses (active food trucks)
    const [activeBusinesses] = await db
      .select({ count: count() })
      .from(businesses)
      .where(eq(businesses.status, "approved"));

    // Count all users and owners (excluding admins and founders)
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(or(eq(users.role, "user"), eq(users.role, "owner")));

    return NextResponse.json({
      activeTrucks: activeBusinesses.count,
      users: totalUsers.count,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "خطای سرور" },
      { status: 500 }
    );
  }
}
