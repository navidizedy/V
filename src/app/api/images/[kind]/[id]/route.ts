import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, businessPhotos, menuItems, ownerProfiles } from "@/db/schema";
import { decodeDataUrl, type ImageKind } from "@/lib/image-url";

/**
 * Streams a user-uploaded image (stored as base64 in the DB) as a real binary
 * response. URLs are versioned (`?v=<updatedAt>`), so responses can be cached
 * aggressively by the browser, CDNs and Next's image optimizer.
 *
 * Only *public* images are reachable here — the private ownership-verification
 * photo is intentionally not exposed.
 */
async function loadImage(kind: ImageKind, id: number): Promise<string | null> {
  switch (kind) {
    case "business-logo": {
      const [row] = await db
        .select({ value: businesses.logo, status: businesses.status })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
      return row?.value ?? null;
    }
    case "business-cover": {
      const [row] = await db
        .select({ value: businesses.coverImage })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
      return row?.value ?? null;
    }
    case "menu-item": {
      const [row] = await db
        .select({ value: menuItems.image })
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);
      return row?.value ?? null;
    }
    case "photo": {
      const [row] = await db
        .select({ value: businessPhotos.url })
        .from(businessPhotos)
        .where(eq(businessPhotos.id, id))
        .limit(1);
      return row?.value ?? null;
    }
    case "avatar": {
      const [row] = await db
        .select({ value: ownerProfiles.avatar })
        .from(ownerProfiles)
        .where(eq(ownerProfiles.userId, id))
        .limit(1);
      return row?.value ?? null;
    }
    default:
      return null;
  }
}

const VALID_KINDS = new Set<ImageKind>(["business-logo", "business-cover", "menu-item", "photo", "avatar"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  const numericId = parseInt(id, 10);

  if (!VALID_KINDS.has(kind as ImageKind) || !Number.isInteger(numericId) || numericId <= 0) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const stored = await loadImage(kind as ImageKind, numericId);
    if (!stored) return new NextResponse(null, { status: 404 });

    // Some legacy rows may hold a plain URL rather than a data URL — just redirect.
    if (!stored.startsWith("data:")) {
      return NextResponse.redirect(stored, 302);
    }

    const decoded = decodeDataUrl(stored);
    if (!decoded) return new NextResponse(null, { status: 404 });

    const versioned = req.nextUrl.searchParams.has("v");
    const body = new Uint8Array(decoded.buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": decoded.contentType,
        "Content-Length": String(body.byteLength),
        // Versioned URLs are immutable; unversioned ones still get a sensible TTL.
        "Cache-Control": versioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`GET /api/images/${kind}/${id} error:`, error);
    return new NextResponse(null, { status: 500 });
  }
}
