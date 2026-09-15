"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { BusinessCard } from "@/components/business-card";
import { Heart, Store } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && session?.user?.role === "user") {
      router.push("/favorites");
      return;
    }
    if (session) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((data) => { setFavorites(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [session, status, router]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 min-w-0">
        <div className="max-w-5xl">
          <BackButton fallback="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">علاقه‌مندی‌ها</h1>
          <p className="text-gray-500 text-sm mb-8">فودتراک‌هایی که ذخیره کرده‌اید</p>

          {favorites.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((fav) => (
                <BusinessCard
                  key={fav.id}
                  business={{
                    id: fav.businessId,
                    name: fav.businessName,
                    slug: fav.businessSlug,
                    logo: fav.businessLogo,
                    coverImage: fav.businessCoverImage,
                    city: fav.businessCity,
                    locationText: fav.businessLocation,
                    isOpen: fav.businessIsOpen,
                    rating: fav.businessRating,
                    reviewCount: fav.businessReviewCount,
                    views: fav.businessViews,
                    categoryName: fav.categoryName,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Heart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">هنوز علاقه‌مندی ندارید</h3>
              <p className="text-gray-500 text-sm mb-6">فودتراک‌های مورد علاقه خود را با زدن ❤️ ذخیره کنید</p>
              <Link href="/businesses" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold">
                <Store className="w-4 h-4" />
                جستجوی فودتراک‌ها
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
