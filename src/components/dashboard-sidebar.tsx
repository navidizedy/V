"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Store,
  User,
  Shield,
  CreditCard,
  LogOut,
  Menu,
  X,
  Home,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

export function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "founder";
  const isFounder = session?.user?.role === "founder";
  const isOwner = session?.user?.role === "owner";

  useEffect(() => {
    if (!session || !isOwner) {
      setAvatar(null);
      return;
    }
    
    // Use session ID as cache key to prevent flickering
    const cacheKey = `avatar_${session.user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAvatar(cached === 'null' ? null : cached);
    }
    
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const avatarUrl = data?.avatar || null;
        setAvatar(avatarUrl);
        sessionStorage.setItem(cacheKey, avatarUrl || 'null');
      })
      .catch(() => {
        setAvatar(null);
        sessionStorage.setItem(cacheKey, 'null');
      });
  }, [session, isOwner]);

  const links = [
    { href: "/dashboard/admin", label: "داشبورد", icon: Shield, show: isAdmin },
    { href: "/dashboard/owner", label: "فودتراک‌های من", icon: Store, show: isOwner },
    { href: "/dashboard/subscription", label: "اشتراک و پلن", icon: CreditCard, show: isOwner },
    { href: "/dashboard/profile", label: "پروفایل", icon: User, show: isOwner },
  ];

  return (
    <>
      {/* Mobile FAB toggle — bottom-left so it never overlaps RTL page headers */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-5 left-5 z-50 p-3.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-transform cursor-pointer"
        aria-label="منوی داشبورد"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden cursor-pointer" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-64 shrink-0 bg-white border-l border-gray-100 z-40 transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <Logo size={34} />
          </Link>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-orange-50 transition-colors"
            title="بازگشت به سایت"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.filter((l) => l.show).map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2.5 py-2 mb-2">
            {isOwner && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt={session?.user?.name || ""} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{session?.user?.name}</p>
              <p className="text-[11px] text-gray-400 truncate">
                {isFounder ? "بنیان‌گذار" : isAdmin ? "ادمین" : isOwner ? "مالک فودتراک" : "کاربر"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </aside>
    </>
  );
}
