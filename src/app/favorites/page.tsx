"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BusinessCard } from "@/components/business-card";
import { Heart, Store } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default function PublicFavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (session) {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((data) => {
          setFavorites(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <BackButton fallback="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6 transition-colors" />
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">علاقه‌مندی‌های من</h1>
            <p className="text-sm text-gray-500">فودتراک‌هایی که ذخیره کرده‌اید</p>
          </div>
          <Link href="/businesses" className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-100 text-sm font-bold text-gray-700 hover:text-primary hover:border-orange-200 transition-colors">
            <Store className="w-4 h-4" />
            جستجوی بیشتر
          </Link>
        </div>

        {favorites.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">هنوز چیزی ذخیره نکرده‌اید</h2>
            <p className="text-gray-500 text-sm mb-7">وقتی یک فودتراک را دوست داشتید، روی قلب بزنید تا اینجا ببینید.</p>
            <Link href="/businesses" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold btn-glow">
              <Store className="w-4 h-4" />
              دیدن فودتراک‌ها
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
