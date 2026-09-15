"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BusinessCard } from "@/components/business-card";
import { BackButton } from "@/components/back-button";
import { BackToTop } from "@/components/back-to-top";
import { IRAN_CITIES } from "@/lib/cities";
import { useCategories } from "@/lib/use-categories";
import {
  Search,
  SlidersHorizontal,
  X,
  Store,
  MapPin,
  ArrowUpDown,
  Power,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const sortOptions = [
  { id: "newest", label: "جدیدترین" },
  { id: "rating", label: "بیشترین امتیاز" },
  { id: "views", label: "پربازدیدترین" },
  { id: "name", label: "نام (الفبا)" },
];

/**
 * How many trucks are fetched per request. The list is long, so instead of
 * pulling everything (the old behaviour was a single `?limit=60` call) we page
 * through it 20 at a time and append as the user scrolls.
 */
const PAGE_SIZE = 20;
// Start pre-fetching the next page a little before the sentinel is on screen so
// the extra cards are usually already there by the time the user arrives.
const PREFETCH_MARGIN = "800px";

// The API returns a loose shape (numbers arrive as strings from some drivers) and
// BusinessCard only reads a handful of fields off it.
type Business = any;

function BusinessesContent() {
  const searchParams = useSearchParams();
  // Shared, cached category list (same source as the homepage and the onboarding form)
  const { categories, loading: categoriesLoading } = useCategories();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  // `loadingMore` is only true for the *appended* pages, so the grid never
  // flashes to skeletons once the first page is on screen.
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "all");
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get("cuisine") || "all");
  const [openNow, setOpenNow] = useState(searchParams.get("openNow") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [showFilters, setShowFilters] = useState(false);

  // Guards against a slow earlier request overwriting a newer one (stale responses).
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const buildQuery = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams();
      if (selectedCity !== "all") params.set("city", selectedCity);
      if (selectedCuisine !== "all") params.set("cuisine", selectedCuisine);
      if (searchQuery) params.set("search", searchQuery);
      if (openNow) params.set("openNow", "true");
      params.set("sort", sort);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((nextPage - 1) * PAGE_SIZE));
      return params.toString();
    },
    [selectedCity, selectedCuisine, searchQuery, openNow, sort],
  );

  /** Reset the list and pull page 1 whenever any filter changes. */
  useEffect(() => {
    const controller = new AbortController();
    const id = ++requestId.current;

    setLoading(true);
    setLoadError(false);

    fetch(`/api/businesses?${buildQuery(1)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: any) => {
        if (id !== requestId.current) return;
        const rows: Business[] = data.businesses || (Array.isArray(data) ? data : []);
        setBusinesses(rows);
        setTotal(typeof data.total === "number" ? data.total : rows.length);
        setHasMore(Boolean(data.hasMore));
        setPage(1);
      })
      .catch((err) => {
        if ((err as Error)?.name === "AbortError") return;
        if (id !== requestId.current) return;
        setBusinesses([]);
        setTotal(0);
        setHasMore(false);
        setLoadError(true);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });

    return () => controller.abort();
  }, [buildQuery]);

  /** Append the next page (infinite scroll + the explicit "load more" button). */
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    const nextPage = page + 1;
    const id = requestId.current;
    setLoadingMore(true);
    setLoadError(false);

    try {
      const r = await fetch(`/api/businesses?${buildQuery(nextPage)}`);
      const data = await r.json();
      if (id !== requestId.current) return;
      const rows: Business[] = data.businesses || (Array.isArray(data) ? data : []);

      setBusinesses((prev) => {
        // De-dupe by id — a brand new truck can legitimately appear on two pages
        // if it is created between the two requests.
        const seen = new Set(prev.map((b) => b.id));
        return [...prev, ...rows.filter((b) => !seen.has(b.id))];
      });
      setTotal(typeof data.total === "number" ? data.total : 0);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } catch {
      if (id === requestId.current) setLoadError(true);
    } finally {
      if (id === requestId.current) setLoadingMore(false);
    }
  }, [buildQuery, hasMore, loading, loadingMore, page]);

  // Infinite scroll: watch the sentinel at the end of the grid.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const activeFilterCount =
    (selectedCity !== "all" ? 1 : 0) + (selectedCuisine !== "all" ? 1 : 0) + (openNow ? 1 : 0);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setSelectedCity("all");
    setSelectedCuisine("all");
    setOpenNow(false);
    setSort("newest");
  }, []);

  const fa = (n: number) => n.toLocaleString("fa-IR");
  const shownCount = businesses.length;
  const from = shownCount === 0 ? 0 : 1;
  const to = shownCount;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summary = loading
    ? "در حال جستجو..."
    : total > 0
      ? `نمایش ${fa(from)} تا ${fa(to)} از ${fa(total)} فودتراک`
      : "فودتراکی یافت نشد";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton fallback="/" />

          <h1 className="text-2xl font-extrabold text-gray-900 mt-4 mb-2">فودتراک‌ها</h1>
          <p className="text-gray-500 text-sm mb-6">{summary}</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="جستجوی فودتراک..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City selector - always visible, this is a primary filter for a nationwide platform */}
            <div className="relative sm:w-48">
              <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="all">همه شهرها</option>
                {IRAN_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              فیلترها
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4 animate-fade-in">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">نوع غذا</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCuisine("all")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      selectedCuisine === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    همه
                  </button>
                  {categoriesLoading && categories.length === 0 &&
                    [...Array(6)].map((_, i) => (
                      <div key={i} className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse" />
                    ))}
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCuisine(cat.nameFa)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        selectedCuisine === cat.nameFa ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat.nameFa}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {sortOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setOpenNow(!openNow)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    openNow ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  فقط بازها
                </button>

                {(activeFilterCount > 0 || searchInput || sort !== "newest") && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    پاک کردن همه
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-80 skeleton" />
              ))}
            </div>
          ) : businesses.length ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {businesses.map((biz) => (
                  <BusinessCard key={biz.id} business={biz} />
                ))}
              </div>

              {/* Infinite-scroll sentinel + pagination footer */}
              <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال بارگذاری فودتراک‌های بیشتر...
                  </span>
                ) : hasMore ? (
                  <>
                    <button
                      onClick={loadMore}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:border-orange-300 hover:text-primary transition-colors shadow-sm cursor-pointer"
                    >
                      فودتراک‌های بیشتر
                    </button>
                    <p className="text-xs text-gray-400">
                      صفحه {fa(page)} از {fa(lastPage)} — {fa(total - shownCount)} فودتراک دیگر
                    </p>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    همه {fa(total)} فودتراک نمایش داده شد
                  </span>
                )}

                {loadError && (
                  <p className="text-xs text-red-500">
                    بارگذاری صفحه بعد ناموفق بود — دوباره تلاش کنید.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">فودتراکی یافت نشد</h3>
              <p className="text-gray-500 mb-6">با فیلترهای دیگری امتحان کنید</p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                پاک کردن فیلترها
              </button>
            </div>
          )}
        </div>
      </div>

      <BackToTop />
      <Footer />
    </div>
  );
}

/**
 * Server-rendered shell shown while `useSearchParams()` resolves. Without it the
 * first paint of the truck list is a blank page — bad enough in a browser, worse
 * in an installed PWA. It keeps the navbar and the back button usable.
 */
function BusinessesListSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BackButton fallback="/" />
          <div className="skeleton rounded-lg h-7 w-40 mt-4 mb-3" />
          <div className="skeleton rounded-lg h-4 w-56 mb-6" />
          <div className="skeleton rounded-xl h-12 w-full" />
        </div>
      </div>
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 skeleton" />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={<BusinessesListSkeleton />}>
      <BusinessesContent />
    </Suspense>
  );
}
