"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Star, Truck, Users } from "lucide-react";

type Stats = { activeTrucks: number; users: number; rating: number; cities: number };

const nf0 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Trust strip with a count-up animation.
 *
 * The final values are rendered on the server (good for SEO/no-JS and no layout
 * shift); the animation only starts once the strip scrolls into view, runs on
 * requestAnimationFrame (not a 60x setInterval) and is skipped entirely for users
 * who prefer reduced motion.
 */
export function StatsStrip({ stats }: { stats: Stats }) {
  const [display, setDisplay] = useState<Stats>(stats);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || animated.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const run = () => {
      animated.current = true;
      const duration = 1600;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setDisplay({
          activeTrucks: Math.round(stats.activeTrucks * e),
          users: Math.round(stats.users * e),
          rating: Number((stats.rating * e).toFixed(1)),
          cities: Math.round(stats.cities * e),
        });
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDisplay(stats);
      };
      setDisplay({ activeTrucks: 0, users: 0, rating: 0, cities: 0 });
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [stats]);

  const items = [
    { icon: Truck, label: "فودتراک فعال", value: nf0.format(display.activeTrucks) },
    { icon: Users, label: "کاربر فعال", value: nf0.format(display.users) },
    { icon: Star, label: "امتیاز کاربران", value: nf1.format(display.rating) },
    { icon: Building2, label: "شهر فعال", value: nf0.format(display.cities) + "+" },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {items.map((stat) => (
        <div key={stat.label} className="flex items-center gap-4 justify-center lg:justify-start">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
            <stat.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums min-w-[3ch]">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
