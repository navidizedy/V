import { createHash } from "crypto";
import { db } from "@/db";
import { categories } from "@/db/schema";

/**
 * Server-side cache for the global food categories.
 *
 * Categories almost never change (only admins/founder can add/edit/delete them), yet they are
 * requested on every visit to the homepage, the trucks page (filters), the "new truck" form and
 * the owner edit form. Instead of hitting PostgreSQL on every request we keep a single
 * in-memory copy and hand it out until an admin mutates a category, at which point the cache
 * is invalidated *synchronously* (so the very next read is fresh — no stale window) and warmed
 * again in the background.
 *
 * Design notes:
 *  - Module-level singleton stored on `globalThis` so it survives HMR in dev and is shared by
 *    every route handler in the same Node process.
 *  - Request de-duplication: concurrent cold reads share a single in-flight DB query.
 *  - Safety-net TTL: in multi-instance deployments a mutation on instance A can't reach the
 *    memory of instance B, so entries are also considered stale after `TTL_MS`. Stale entries
 *    are served immediately while a background refresh runs (stale-while-revalidate).
 *  - Every entry carries an ETag (content hash) which `/api/categories` uses so browsers and the
 *    client-side store can cheaply revalidate with `If-None-Match` → 304.
 */

export type Category = typeof categories.$inferSelect;

export type CategoriesCacheEntry = {
  data: Category[];
  etag: string;
  loadedAt: number;
};

type CacheStore = {
  entry: CategoriesCacheEntry | null;
  inflight: Promise<CategoriesCacheEntry> | null;
  /** Bumped on every invalidation; lets a stale in-flight load know it must not overwrite fresh data. */
  version: number;
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes safety-net (see design notes above)

const globalStore = globalThis as unknown as { __vanjaCategoriesCache?: CacheStore };
const store: CacheStore =
  globalStore.__vanjaCategoriesCache ?? (globalStore.__vanjaCategoriesCache = { entry: null, inflight: null, version: 0 });

function computeEtag(data: Category[]) {
  const hash = createHash("sha1")
    .update(JSON.stringify(data.map((c) => [c.id, c.name, c.nameFa, c.icon, c.color])))
    .digest("hex")
    .slice(0, 20);
  return `"cat-${hash}"`;
}

async function loadFromDatabase(): Promise<CategoriesCacheEntry> {
  const data = await db.select().from(categories).orderBy(categories.nameFa);
  return { data, etag: computeEtag(data), loadedAt: Date.now() };
}

function refresh(): Promise<CategoriesCacheEntry> {
  if (store.inflight) return store.inflight;

  const versionAtStart = store.version;
  const promise = loadFromDatabase()
    .then((entry) => {
      // Only commit if nobody invalidated the cache while we were querying.
      if (store.version === versionAtStart) store.entry = entry;
      return entry;
    })
    .finally(() => {
      if (store.inflight === promise) store.inflight = null;
    });

  store.inflight = promise;
  return promise;
}

function isFresh(entry: CategoriesCacheEntry) {
  return Date.now() - entry.loadedAt < TTL_MS;
}

/**
 * Returns the cached categories (plus ETag). Hits the database only on a cold cache or after
 * an invalidation; a TTL-expired entry is served instantly while refreshing in the background.
 */
export async function getCategoriesCached(): Promise<CategoriesCacheEntry & { hit: "HIT" | "STALE" | "MISS" }> {
  const entry = store.entry;
  if (entry && isFresh(entry)) return { ...entry, hit: "HIT" };
  if (entry) {
    void refresh().catch(() => undefined);
    return { ...entry, hit: "STALE" };
  }
  const fresh = await refresh();
  return { ...fresh, hit: "MISS" };
}

/** Convenience helper when only the list is needed. */
export async function getCategories(): Promise<Category[]> {
  return (await getCategoriesCached()).data;
}

/**
 * Drop the cached copy. Call this right after any category insert/update/delete.
 * The cache is re-warmed in the background so the next visitor doesn't pay the DB round-trip.
 */
export function invalidateCategoriesCache({ warm = true }: { warm?: boolean } = {}) {
  store.version += 1;
  store.entry = null;
  store.inflight = null;
  if (warm) void refresh().catch(() => undefined);
}
