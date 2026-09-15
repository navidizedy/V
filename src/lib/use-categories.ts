"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Client-side cache for the global food categories.
 *
 * The homepage, the trucks page (filters), the "new truck" wizard and the owner edit form all
 * need the same tiny list. This module keeps ONE copy for the whole tab:
 *
 *  - in-memory store shared by every component (navigating between pages never re-downloads it)
 *  - persisted to localStorage so a fresh page load can paint the categories instantly
 *  - stale-while-revalidate: cached data is shown immediately, then a background request with
 *    `If-None-Match` asks the server whether anything changed. A 304 costs nothing; a 200 swaps
 *    the list in place. In-flight requests are de-duplicated across subscribers.
 *  - `clearCategoriesClientCache()` lets the admin panel force a refetch right after mutating
 *    categories, so the admin sees their own change straight away.
 */

export type CategoryItem = {
  id: number;
  name: string;
  nameFa: string;
  icon: string | null;
  color: string | null;
  createdAt?: string;
};

type Snapshot = {
  categories: CategoryItem[];
  etag: string | null;
  fetchedAt: number;
  /** true until the very first network response (or cached copy) has arrived */
  loading: boolean;
  error: boolean;
};

const STORAGE_KEY = "vanja:categories:v1";
/** How long a cached copy is considered fresh enough to skip background revalidation. */
const FRESH_MS = 60 * 1000;

const EMPTY: Snapshot = { categories: [], etag: null, fetchedAt: 0, loading: true, error: false };

let snapshot: Snapshot = EMPTY;
let hydratedFromStorage = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

function readStorage(): Pick<Snapshot, "categories" | "etag" | "fetchedAt"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.categories)) return null;
    return {
      categories: parsed.categories as CategoryItem[],
      etag: typeof parsed.etag === "string" ? parsed.etag : null,
      fetchedAt: typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeStorage(data: Pick<Snapshot, "categories" | "etag" | "fetchedAt">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode — ignore, memory cache still works */
  }
}

function hydrateFromStorage() {
  if (hydratedFromStorage) return;
  hydratedFromStorage = true;
  const stored = readStorage();
  if (stored && stored.categories.length > 0) {
    snapshot = { ...snapshot, ...stored, loading: false };
  }
}

/**
 * Fetch (or revalidate) the categories. Shared across all subscribers.
 * @param force skip the freshness check and always ask the server
 */
export function revalidateCategories(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (inflight) return inflight;

  const hasData = snapshot.categories.length > 0;
  if (!force && hasData && Date.now() - snapshot.fetchedAt < FRESH_MS) {
    return Promise.resolve();
  }

  const headers: Record<string, string> = {};
  if (hasData && snapshot.etag) headers["If-None-Match"] = snapshot.etag;

  inflight = fetch("/api/categories", { headers, cache: "no-cache" })
    .then(async (res) => {
      if (res.status === 304) {
        // Unchanged — just bump freshness.
        const next = { categories: snapshot.categories, etag: snapshot.etag, fetchedAt: Date.now() };
        writeStorage(next);
        setSnapshot({ ...next, loading: false, error: false });
        return;
      }
      if (!res.ok) throw new Error(`categories request failed: ${res.status}`);
      const data = await res.json();
      const list: CategoryItem[] = Array.isArray(data) ? data : [];
      const next = { categories: list, etag: res.headers.get("etag"), fetchedAt: Date.now() };
      writeStorage(next);
      setSnapshot({ ...next, loading: false, error: false });
    })
    .catch(() => {
      // Keep whatever we already have; only flag an error if we have nothing to show.
      setSnapshot({ loading: false, error: snapshot.categories.length === 0 });
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Wipe both memory and storage copies and immediately refetch. Used by the admin panel. */
export function clearCategoriesClientCache(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  snapshot = { ...snapshot, etag: null, fetchedAt: 0 };
  emit();
  return revalidateCategories(true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

/**
 * React hook returning the shared categories list.
 * Paints instantly from cache when available and revalidates in the background.
 */
export function useCategories() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    hydrateFromStorage();
    if (snapshot !== state) emit();
    void revalidateCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => revalidateCategories(true), []);

  return {
    categories: state.categories,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
