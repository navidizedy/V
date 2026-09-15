/**
 * User-uploaded images are stored in PostgreSQL as base64 `data:` URLs.
 *
 * Shipping those base64 strings inside JSON responses is the single biggest
 * performance problem on mobile: a list of 8 trucks with a cover + logo each
 * can be several megabytes of JSON that must be downloaded and parsed before
 * anything renders — and `next/image` cannot optimise `data:` URLs at all.
 *
 * Instead, public API responses reference images through
 * `/api/images/<kind>/<id>?v=<version>`; that route streams the decoded bytes
 * with immutable cache headers, and `next/image` can then resize/convert them
 * to AVIF/WebP for the exact viewport size.
 */

export type ImageKind =
  | "business-logo"
  | "business-cover"
  | "menu-item"
  | "photo"
  | "avatar";

export const IMAGE_ROUTE_PREFIX = "/api/images/";

export function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** True when the value is one of our own proxied image URLs (i.e. unchanged on edit). */
export function isProxiedImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(IMAGE_ROUTE_PREFIX);
}

/**
 * Turn a stored image column value into something safe & cheap to send to the client.
 * - `data:` URLs → proxied `/api/images/...` URL (versioned for cache-busting)
 * - regular http(s) URLs or null → returned as-is
 */
export function toPublicImageUrl(
  kind: ImageKind,
  id: number | string,
  value: string | null | undefined,
  version?: Date | string | number | null
): string | null {
  if (!value) return null;
  if (!isDataUrl(value)) return value;
  const v =
    version instanceof Date
      ? version.getTime()
      : typeof version === "string"
        ? encodeURIComponent(version)
        : version || 0;
  return `${IMAGE_ROUTE_PREFIX}${kind}/${id}?v=${v}`;
}

/** Parse a `data:image/...;base64,....` string into bytes + mime type. */
export function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}
