import { NextRequest, NextResponse } from "next/server";
import { getCategoriesCached } from "@/lib/categories-cache";

// Data comes from our own in-memory cache (see src/lib/categories-cache.ts), so the handler
// itself must run on every request — Next's full-route cache would defeat explicit invalidation.
export const dynamic = "force-dynamic";

/**
 * Public list of food categories.
 *
 * - Served from the server-side cache (DB is only hit on cold start / after an admin change).
 * - Emits a content-based ETag; browsers and the client store revalidate with `If-None-Match`
 *   and receive a body-less 304 when nothing changed, so repeat loads cost almost nothing.
 * - `Cache-Control: no-cache` means "always revalidate with the server" (NOT "don't cache"),
 *   which keeps invalidation instant while still allowing the cheap 304 path.
 */
export async function GET(req: NextRequest) {
  try {
    const { data, etag, hit } = await getCategoriesCached();

    const headers: Record<string, string> = {
      ETag: etag,
      "Cache-Control": "public, no-cache, must-revalidate",
      Vary: "Accept-Encoding",
      "X-Cache": hit,
    };

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch.split(",").map((t) => t.trim()).includes(etag)) {
      return new NextResponse(null, { status: 304, headers });
    }

    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
