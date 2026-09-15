import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, Star, Eye, BadgeCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface BusinessCardProps {
  business: {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    logo?: string | null;
    coverImage?: string | null;
    city?: string | null;
    locationText: string;
    phone?: string | null;
    isOpen: boolean;
    rating?: string | null;
    reviewCount?: number | null;
    views?: number | null;
    categoryName?: string | null;
    categoryColor?: string | null;
    categories?: { id: number; nameFa: string; color?: string | null }[] | null;
    cuisines?: string[] | null;
    ownerPlan?: string | null;
  };
}

// Shown on businesses owned by a "pro" plan subscriber — an Instagram-style verification
// checkmark (blue seal badge with a white tick) matching the "نشان «ون جا پلاس»" perk
// promised on the pricing/subscription plan cards.
export function VanjaPlusBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title="این فودتراک مشترک پلن حرفه‌ای ون‌جاست"
    >
      <BadgeCheck
        className="w-[18px] h-[18px] text-sky-500"
        fill="#3897F0"
        stroke="white"
        strokeWidth={2.2}
      />
    </span>
  );
}

// Reusable colored category chips — used on business cards across the public
// listing page as well as the owner/admin dashboards so category badges look
// consistent everywhere in the app.
export function CategoryPills({
  categories,
  max = 3,
  className = "",
}: {
  categories?: { id: number; nameFa: string; color?: string | null }[] | null;
  max?: number;
  className?: string;
}) {
  if (!categories || categories.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {categories.slice(0, max).map((cat) => {
        const color = cat.color || "#F97316";
        return (
          <span
            key={cat.id}
            style={{ backgroundColor: `${color}1A`, color }}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          >
            {cat.nameFa}
          </span>
        );
      })}
      {categories.length > max && (
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
          +{(categories.length - max).toLocaleString("fa-IR")}
        </span>
      )}
    </div>
  );
}

// The rounded, overlapping logo thumbnail shown over a cover image — the same
// visual treatment used on the public food truck listing ("آگهی فودتراک‌ها")
// cards, reused on the owner/admin dashboards for a consistent look.
export function TruckLogoOverlay({
  logo,
  name,
  size = 56,
  className = "",
}: {
  logo?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (!logo) return null;
  return (
    <div
      className={`absolute -bottom-5 right-4 rounded-2xl bg-white p-1 shadow-md border border-white overflow-hidden z-10 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt={`لوگوی ${name}`}
        width={size}
        height={size}
        sizes={`${size}px`}
        loading="lazy"
        className="w-full h-full object-cover rounded-xl"
      />
    </div>
  );
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative">
        <div className="relative h-40 bg-gradient-to-br from-orange-100 via-rose-50 to-pink-100 overflow-hidden rounded-t-2xl">
          {business.coverImage ? (
            <Image
              src={business.coverImage}
              alt={business.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
                <span className="text-2xl font-extrabold gradient-text">
                  {business.name.charAt(0)}
                </span>
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm ${
                business.isOpen ? "bg-green-500/90 text-white" : "bg-gray-700/80 text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${business.isOpen ? "bg-white animate-pulse" : "bg-gray-300"}`} />
              {business.isOpen ? "باز است" : "بسته است"}
            </span>
          </div>
        </div>
        <TruckLogoOverlay logo={business.logo} name={business.name} size={56} />
      </div>

      <div className={`p-4 rounded-b-2xl ${business.logo ? "pt-7" : ""}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
            {business.name}
          </h3>
          {business.ownerPlan === "pro" && <VanjaPlusBadge className="shrink-0" />}
        </div>
        {business.categories && business.categories.length > 0 ? (
          <CategoryPills categories={business.categories} className="mb-2" />
        ) : business.cuisines && business.cuisines.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {business.cuisines.slice(0, 3).map((cuisine) => (
              <span key={cuisine} className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold">
                {cuisine}
              </span>
            ))}
          </div>
        ) : null}
        {business.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3 leading-6">{business.description}</p>
        )}

        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">
            {business.city && <span className="font-medium text-gray-600">{business.city} — </span>}
            {business.locationText}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {business.rating && parseFloat(business.rating) > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-gray-700">{business.rating}</span>
                <span className="text-xs text-gray-400">({business.reviewCount || 0})</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">بدون امتیاز</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs">{formatPrice(business.views || 0)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
