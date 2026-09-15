"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  X,
  PlusCircle,
  LogOut,
  User,
  Heart,
  ChevronDown,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { InstallPwaButton } from "@/components/install-pwa-button";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  // The desktop menu is always mounted (it is only hidden with `hidden md:flex`),
  // so a single ref pointing at it made every tap on the *mobile* trigger look
  // like an outside click. Each variant now gets its own ref and a click counts
  // as "inside" if it lands in either one.
  const desktopAccountRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);

  const role = session?.user?.role;
  const isAdminRole = role === "admin" || role === "founder";
  const isFounder = role === "founder";
  const isOwner = role === "owner";

  useEffect(() => {
    if (!accountOpen) return;

    const onOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop =
        desktopAccountRef.current?.contains(target) ?? false;
      const insideMobile = mobileAccountRef.current?.contains(target) ?? false;
      if (!insideDesktop && !insideMobile) {
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!session || !isOwner) {
      setAvatar(null);
      return;
    }

    // Use session ID as cache key to prevent flickering
    const cacheKey = `avatar_${session.user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAvatar(cached === "null" ? null : cached);
    }

    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const avatarUrl = data?.avatar || null;
        setAvatar(avatarUrl);
        sessionStorage.setItem(cacheKey, avatarUrl || "null");
      })
      .catch(() => {
        setAvatar(null);
        sessionStorage.setItem(cacheKey, "null");
      });
  }, [session, isOwner]);

  const navLinks = [
    { href: "/businesses", label: "فودتراک‌ها" },
    { href: "/pricing", label: "پلن‌ها" },
    { href: "/about", label: "درباره ما" },
    { href: "/contact", label: "تماس با ما" },
  ];

  const accountLinks = [
    ...(isAdminRole
      ? [{ href: "/dashboard/admin", label: "داشبورد", icon: ShieldCheck }]
      : []),
    ...(isOwner
      ? [{ href: "/dashboard/owner", label: "داشبورد", icon: Store }]
      : []),
    ...(!isOwner && !isAdminRole
      ? [
          { href: "/profile", label: "پروفایل", icon: User },
          { href: "/favorites", label: "علاقه‌مندی‌ها", icon: Heart },
        ]
      : []),
  ];

  // NOTE: this is a plain function that returns JSX (not a nested component
  // rendered via <AccountMenu />). Defining it as its own component type
  // inside Navbar's render caused React to remount it (and reset accountOpen)
  // every time Navbar re-rendered — e.g. when the session finished loading or
  // the avatar fetch resolved right after page load/reload. That remount is
  // exactly why the very first click right after launch appeared to do
  // nothing: the dropdown opened for an instant and was immediately reset by
  // the next re-render, until things settled down.
  const renderAccountMenu = (mobile = false) => {
    if (!session) return null;
    return (
      <div
        ref={mobile ? mobileAccountRef : desktopAccountRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-2 rounded-xl transition-colors cursor-pointer ${
            mobile
              ? "w-full px-3 py-2.5 bg-gray-50 justify-between"
              : "px-2.5 py-2 hover:bg-gray-50"
          }`}
        >
          {isOwner ? (
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={session.user.name || "کاربر"}
                  width={32}
                  height={32}
                  sizes="32px"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
            </span>
          ) : null}
          <span className="min-w-0 text-right">
            <span className="block text-sm font-bold text-gray-800 truncate max-w-28">
              {session.user.name || "کاربر"}
            </span>
            <span className="block text-[11px] text-gray-400 truncate max-w-28">
              {isFounder
                ? "بنیان‌گذار"
                : isAdminRole
                  ? "ادمین"
                  : isOwner
                    ? "مالک"
                    : "کاربر"}
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${accountOpen ? "rotate-180" : ""}`}
          />
        </button>

        {accountOpen && (
          <div
            className={`${
              mobile
                ? "mt-2 border border-gray-100 rounded-xl overflow-hidden animate-fade-in"
                : "absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-900/5 overflow-hidden z-50"
            }`}
          >
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="font-bold text-sm text-gray-900 truncate">
                {session.user.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {session.user.email}
              </div>
            </div>
            <div className="p-1.5">
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setAccountOpen(false);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-orange-50 hover:text-primary transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0" aria-label="خانه ون جا">
            <Logo size={40} priority />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary bg-orange-50"
                    : "text-gray-600 hover:text-primary hover:bg-orange-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <InstallPwaButton />
            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              ثبت فودتراک
            </Link>
            {session ? (
              renderAccountMenu(false)
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-orange-50 transition-colors"
                >
                  ورود
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 transition-all btn-glow"
                >
                  ثبت‌نام
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setAccountOpen(false);
            }}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer"
            aria-label="منو"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-orange-50"
              >
                {link.label}
              </Link>
            ))}
            <InstallPwaButton mobile />
            <Link
              href="/businesses/new"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              ثبت فودتراک
            </Link>
            {session ? (
              renderAccountMenu(true)
            ) : (
              <div className="flex gap-2 pt-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700"
                >
                  ورود
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500"
                >
                  ثبت‌نام
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
