"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { IRAN_CITIES } from "@/lib/cities";

/**
 * Small interactive island for the hero search box. Everything else in the hero
 * is static server-rendered markup, so only this form ships JavaScript.
 */
export function HeroSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCity, setSearchCity] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (searchCity) params.set("city", searchCity);
        const qs = params.toString();
        router.push(qs ? `/businesses?${qs}` : "/businesses");
      }}
      className="mb-6 max-w-xl mx-auto lg:mx-0"
      role="search"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1.5 rounded-2xl border-2 border-gray-200 bg-white shadow-lg shadow-gray-200/40 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-colors">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            name="search"
            dir="rtl"
            lang="fa"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="چی هوس کردی؟"
            aria-label="جستجوی فودتراک"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-2 py-3 bg-transparent focus:outline-none text-base text-right"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 sm:flex-none border-t sm:border-t-0 sm:border-r border-gray-100 pt-1.5 sm:pt-0 sm:pr-1.5">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              name="city"
              dir="rtl"
              aria-label="انتخاب شهر"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="appearance-none pr-9 pl-8 py-3 bg-transparent focus:outline-none text-sm font-medium cursor-pointer w-full sm:max-w-none sm:w-auto"
            >
              <option value="">همه شهرها</option>
              {IRAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            aria-label="جستجو"
            className="shrink-0 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg transition-shadow flex items-center gap-2 min-h-11"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">جستجو</span>
          </button>
        </div>
      </div>
    </form>
  );
}
