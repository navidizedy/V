import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton for the food-truck detail page (`/businesses/[slug]`).
 *
 * Mirrors the real layout 1:1 — header/cover, title & meta, description, contact pills,
 * location card, menu (grouped items), reviews (form + list), and the sidebar (working hours,
 * owner, photo grid) — so the page doesn't jump around when the data arrives.
 */

function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} />;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm p-6", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ width = "w-28", withIcon = true }: { width?: string; withIcon?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {withIcon && <Bone className="w-5 h-5 rounded-md" />}
      <Bone className={cn("h-5", width)} />
    </div>
  );
}

export function BusinessDetailSkeletonBody() {
  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="در حال بارگذاری اطلاعات فودتراک"
    >
      {/* Real back control (not a bone) so it is usable while the page loads —
          that matters in the installed PWA, where a detail page is often the
          very first screen and there is otherwise no way out. */}
      <div className="mb-4 md:hidden">
        <BackButton fallback="/businesses" />
      </div>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Cover */}
        <div className="relative h-48 sm:h-64 skeleton">
          <div className="absolute top-4 right-4 left-4 flex items-start justify-between">
            {/* open/closed badge + category chips */}
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-full bg-white/70 backdrop-blur-sm" />
              <div className="h-7 w-16 rounded-full bg-white/70 backdrop-blur-sm" />
              <div className="hidden sm:block h-7 w-14 rounded-full bg-white/70 backdrop-blur-sm" />
            </div>
            {/* share + favorite */}
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm" />
              <div className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm" />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <Bone className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="flex-1 min-w-0">
              {/* Title + plus badge */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Bone className="h-7 w-48 sm:w-64" />
                <Bone className="h-5 w-16 rounded-full" />
              </div>
              {/* Meta row: city · rating · views */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Bone className="w-4 h-4 rounded" />
                  <Bone className="h-3.5 w-14" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Bone className="w-4 h-4 rounded" />
                  <Bone className="h-3.5 w-8" />
                  <Bone className="h-3.5 w-14" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Bone className="w-4 h-4 rounded" />
                  <Bone className="h-3.5 w-16" />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-5 space-y-2.5">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-11/12" />
            <Bone className="h-3.5 w-2/3" />
          </div>

          {/* Contact pills: phone / instagram / website */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Bone className="h-10 w-36 rounded-lg" />
            <Bone className="h-10 w-32 rounded-lg" />
            <Bone className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Location */}
          <Card>
            <SectionTitle width="w-28" />
            <div className="space-y-2.5 mb-4">
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-3/4" />
            </div>
            <Bone className="h-10 w-44 rounded-xl" />
          </Card>

          {/* Menu */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <Bone className="h-5 w-12" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-8">
              {[3, 2].map((count, groupIdx) => (
                <div key={groupIdx}>
                  {/* menu category label */}
                  <div className="flex items-center gap-2 mb-4">
                    <Bone className="w-1.5 h-1.5 rounded-full" />
                    <Bone className="h-3.5 w-20" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50">
                        <Bone className="w-16 h-16 rounded-xl shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <Bone className={cn("h-4", i % 2 === 0 ? "w-2/5" : "w-1/2")} />
                          <Bone className={cn("h-3", i % 2 === 0 ? "w-3/4" : "w-3/5")} />
                        </div>
                        <Bone className="h-9 w-24 rounded-xl shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Reviews */}
          <Card>
            <SectionTitle width="w-16" />
            {/* review form / login prompt */}
            <div className="mb-6 p-4 rounded-xl bg-gray-50 space-y-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Bone key={i} className="w-5 h-5 rounded-md" />
                ))}
              </div>
              <Bone className="h-20 w-full rounded-lg" />
              <Bone className="h-9 w-24 rounded-lg" />
            </div>
            {/* review list */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-2.5">
                    <Bone className="h-4 w-24" />
                    <div className="flex items-center gap-1">
                      <Bone className="w-3.5 h-3.5 rounded" />
                      <Bone className="h-3.5 w-5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Bone className="h-3 w-full" />
                    <Bone className={cn("h-3", i === 1 ? "w-1/2" : "w-4/5")} />
                  </div>
                  <Bone className="h-2.5 w-16 mt-2.5" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Working hours: 7 rows */}
          <Card>
            <SectionTitle width="w-24" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3">
                  <Bone className="h-3.5 w-14" />
                  <Bone className={cn("h-3.5", i === 6 ? "w-10" : "w-28")} />
                </div>
              ))}
            </div>
          </Card>

          {/* Owner */}
          <Card>
            <SectionTitle width="w-24" withIcon={false} />
            <div className="flex items-center gap-3">
              <Bone className="w-10 h-10 rounded-full shrink-0" />
              <Bone className="h-4 w-28" />
              <Bone className="h-5 w-14 rounded-full" />
            </div>
          </Card>

          {/* Photos grid */}
          <Card>
            <SectionTitle width="w-14" withIcon={false} />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="w-full h-24 rounded-lg" />
              ))}
            </div>
          </Card>
        </div>
      </div>
      <span className="sr-only">در حال بارگذاری...</span>
    </div>
  );
}

/** Full-page variant (navbar + footer), used by the route-level `loading.tsx` and the client page. */
export function BusinessDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <BusinessDetailSkeletonBody />
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
