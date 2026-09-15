"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  MapPin,
  Clock,
  Phone,
  Star,
  Heart,
  ExternalLink,
  Globe,
  Eye,
  ChevronLeft,
  Share2,
  Check,
  LogIn,
  UtensilsCrossed,
  User,
  ImageOff,
  Trash2,
} from "lucide-react";
import { getPersianDayName, formatTime } from "@/lib/utils";
import { ImageLightbox } from "@/components/image-lightbox";
import { VanjaPlusBadge } from "@/components/business-card";
import { InstagramIcon } from "@/components/social-icons";
import { BusinessDetailSkeleton } from "@/components/business-detail-skeleton";
import { BackButton } from "@/components/back-button";
import { useConfirm } from "@/components/confirm-dialog-provider";
import { useToast } from "@/components/toast-provider";
import { LIMITS } from "@/lib/validators";

const REVIEW_COMMENT_MIN = LIMITS.reviewComment.min;
const REVIEW_COMMENT_MAX = LIMITS.reviewComment.max;

export default function BusinessDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [deletingReview, setDeletingReview] = useState(false);
  const trimmedComment = reviewComment.trim();
  const commentTooShort = trimmedComment.length < REVIEW_COMMENT_MIN;
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const myReview =
    session && business?.reviews
      ? business.reviews.find(
          (r: any) => String(r.userId) === String(session.user.id),
        )
      : null;

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/businesses/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setBusiness(data);
        setLoading(false);
        if (data.id) {
          const viewKey = `vanja:viewed:${slug}`;
          if (!sessionStorage.getItem(viewKey)) {
            sessionStorage.setItem(viewKey, "1");
            fetch(`/api/businesses/${slug}`, { method: "POST" })
              .then((r) => r.json())
              .then((viewData) => {
                if (typeof viewData.views === "number") {
                  setBusiness((current: any) =>
                    current ? { ...current, views: viewData.views } : current,
                  );
                }
              })
              .catch(() => undefined);
          }
          fetch(`/api/menu?businessId=${data.id}`)
            .then((r) => r.json())
            .then((menu) => setMenuItems(Array.isArray(menu) ? menu : []))
            .catch(() => setMenuItems([]));
        } else {
          setMenuItems([]);
        }
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const toggleFavorite = async () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/businesses/${slug}`);
      return;
    }
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: business.id }),
    });
    const data = await res.json();
    setBusiness({ ...business, isFavorited: data.favorited });
  };

  const submitReview = async () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/businesses/${slug}`);
      return;
    }
    if (myReview) return;

    // Client-side guard: an empty / whitespace-only comment is not accepted
    // (the API enforces the same rule).
    if (!trimmedComment) {
      setReviewError("لطفاً متن نظر خود را بنویسید.");
      return;
    }
    if (commentTooShort) {
      setReviewError(`متن نظر باید حداقل ${REVIEW_COMMENT_MIN} کاراکتر باشد.`);
      return;
    }

    setSubmittingReview(true);
    setReviewError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          rating: reviewRating,
          comment: trimmedComment,
        }),
      });

      if (res.ok) {
        const data = await fetch(`/api/businesses/${slug}`).then((r) =>
          r.json(),
        );
        setBusiness(data);
        setReviewComment("");
        setReviewRating(5);
        toast.success("نظر شما با موفقیت ثبت شد");
      } else {
        const data = await res.json().catch(() => null);
        setReviewError(data?.error || "خطایی رخ داد، دوباره تلاش کنید.");
      }
    } catch {
      setReviewError("خطایی رخ داد، دوباره تلاش کنید.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const deleteReview = async (reviewId: number) => {
    if (!session || deletingReview) return;

    const ok = await confirmDialog({
      title: "حذف نظر",
      description: "آیا از حذف نظر خود مطمئن هستید؟ این عمل قابل بازگشت نیست.",
      confirmText: "حذف نظر",
      cancelText: "انصراف",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingReview(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) {
        const data = await fetch(`/api/businesses/${slug}`).then((r) =>
          r.json(),
        );
        setBusiness(data);
        toast.success("نظر شما حذف شد");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "حذف نظر با خطا مواجه شد");
      }
    } catch {
      toast.error("حذف نظر با خطا مواجه شد");
    } finally {
      setDeletingReview(false);
    }
  };

  const shareBusiness = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: business.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const menuCategories = Array.from(
    new Set(menuItems.map((item) => item.category).filter(Boolean)),
  );

  if (loading) {
    return <BusinessDetailSkeleton />;
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              فودتراک یافت نشد
            </h1>
            <div className="mt-4 md:hidden">
              <BackButton fallback="/businesses" label="بازگشت به لیست فودتراک‌ها" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="mb-4 md:hidden">
          <BackButton fallback="/businesses" />
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="relative h-48 sm:h-64 bg-gradient-to-br from-orange-100 to-pink-100">
            {business.coverImage ? (
              <Image
                src={business.coverImage}
                alt={business.name}
                fill
                preload
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-white/60 flex items-center justify-center">
                  <span className="text-4xl font-bold gradient-text">
                    {business.name.charAt(0)}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute top-4 right-4 left-4 flex items-start justify-between">
              <div className="flex gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                    business.isOpen
                      ? "bg-green-500/90 text-white"
                      : "bg-gray-500/90 text-white"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {business.isOpen ? "باز است" : "بسته است"}
                </span>
                {business.categories?.map((cat: any) => (
                  <span
                    key={cat.id}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-700"
                  >
                    {cat.nameFa}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareBusiness}
                  className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Share2 className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={toggleFavorite}
                  className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${business.isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                {business.logo && (
                  <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden shrink-0">
                    <Image
                      src={business.logo}
                      alt={`لوگوی ${business.name}`}
                      width={64}
                      height={64}
                      sizes="64px"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {business.name}
                    </h1>
                    {business.ownerPlan === "pro" && <VanjaPlusBadge />}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    {business.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium text-gray-700">
                          {business.city}
                        </span>
                      </div>
                    )}
                    {business.rating && parseFloat(business.rating) > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-gray-700">
                          {business.rating}
                        </span>
                        <span>({business.reviewCount || 0} نظر)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{business.views || 0} بازدید</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {business.description && (
              <p className="mt-4 text-gray-600 leading-relaxed">
                {business.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  {business.phone}
                </a>
              )}
              {business.instagram && (
                <a
                  href={`https://instagram.com/${business.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <InstagramIcon className="w-4 h-4 text-primary" />@
                  {business.instagram}
                </a>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Globe className="w-4 h-4 text-primary" />
                  وب‌سایت
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Location */}
          <div className="order-1 lg:order-1 lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              موقعیت امروز
            </h2>
            <p className="text-gray-600 mb-4">
              {business.city && (
                <span className="font-semibold text-gray-800">
                  {business.city}،{" "}
                </span>
              )}
              {business.locationText}
            </p>
            {business.locationLink && (
              <a
                href={business.locationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 text-primary text-sm font-medium hover:bg-orange-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                باز کردن در گوگل مپ
              </a>
            )}
          </div>

          {/* Menu */}
          <div className="order-2 lg:order-3 lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">منو</h2>
              {menuItems.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                  {menuItems.length.toLocaleString("fa-IR")} محصول
                </span>
              )}
            </div>

            {menuItems.length > 0 ? (
              <div className="space-y-8">
                {/* Category Sections */}
                {["all", ...menuCategories].map((catName) => {
                  const itemsInCat =
                    catName === "all"
                      ? menuItems.filter((i) => !i.category)
                      : menuItems.filter((i) => i.category === catName);

                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={catName} className="animate-fade-in">
                      {catName !== "all" && (
                        <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {catName}
                        </h3>
                      )}
                      <div className="grid grid-cols-1 gap-3">
                        {itemsInCat.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 hover:bg-white hover:ring-1 hover:ring-orange-200 transition-all group"
                          >
                            {item.image && (
                              <button
                                onClick={() => setPreviewImage(item.image)}
                                className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
                              >
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={64}
                                  height={64}
                                  sizes="64px"
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                                {item.name}
                              </div>
                              {item.description && (
                                <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </div>
                            <div className="text-left shrink-0 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                              <span className="font-extrabold text-primary text-sm">
                                {Number(item.price).toLocaleString("fa-IR")}
                              </span>
                              <span className="text-[10px] text-gray-400 mr-1 font-bold">
                                تومان
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-10 flex flex-col items-center gap-3">
                <UtensilsCrossed className="w-8 h-8 opacity-20" />
                منوی این فودتراک هنوز تکمیل نشده است.
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="order-6 lg:order-5 lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              نظرات
            </h2>

            {!session ? (
              <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-bold text-orange-900">
                    برای ثبت امتیاز و نظر وارد شوید
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    نظرات همه قابل مشاهده است، اما برای ارسال نظر باید وارد حساب
                    شوید.
                  </p>
                </div>
                <button
                  onClick={() =>
                    router.push(`/auth/login?callbackUrl=/businesses/${slug}`)
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  ورود / ثبت‌نام
                </button>
              </div>
            ) : myReview ? (
              <div className="mb-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">
                    نظر شما ثبت شده است
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteReview(myReview.id)}
                    disabled={deletingReview}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingReview ? "در حال حذف..." : "حذف نظر"}
                  </button>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= myReview.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                {myReview.comment && (
                  <p className="text-sm text-gray-600">{myReview.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  هر کاربر فقط می‌تواند یک نظر برای هر فودتراک ثبت کند. امکان
                  ویرایش وجود ندارد، اما می‌توانید نظر خود را حذف کنید و دوباره
                  نظر بدهید.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => {
                    setReviewComment(e.target.value);
                    if (reviewError) setReviewError("");
                  }}
                  placeholder="نظر خود را بنویسید..."
                  required
                  maxLength={REVIEW_COMMENT_MAX}
                  aria-invalid={!!reviewError}
                  className={`w-full p-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none ${
                    reviewError ? "border-red-300" : "border-gray-200"
                  }`}
                  rows={3}
                />
                <div className="flex items-center justify-between mt-1.5">
                  {reviewError ? (
                    <p className="text-xs text-red-600">{reviewError}</p>
                  ) : (
                    <p className="text-xs text-gray-400">تعداد حروف</p>
                  )}
                  <span
                    className={`text-xs ${commentTooShort ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {trimmedComment.length.toLocaleString("fa-IR")} /{" "}
                    {REVIEW_COMMENT_MAX.toLocaleString("fa-IR")}
                  </span>
                </div>
                <button
                  onClick={submitReview}
                  disabled={submittingReview || !trimmedComment}
                  className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? "در حال ارسال..." : "ارسال نظر"}
                </button>
              </div>
            )}

            {business.reviews?.length ? (
              <div className="space-y-4">
                {business.reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {review.userName || "کاربر"}
                        {session &&
                          String(review.userId) === String(session.user.id) && (
                            <span className="mr-1.5 text-xs font-normal text-primary">
                              (شما)
                            </span>
                          )}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm text-gray-600">
                            {review.rating}
                          </span>
                        </div>
                        {session &&
                          String(review.userId) === String(session.user.id) && (
                            <button
                              type="button"
                              onClick={() => deleteReview(review.id)}
                              disabled={deletingReview}
                              title="حذف نظر"
                              aria-label="حذف نظر"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                    <span className="text-xs text-gray-400 mt-1 block">
                      {new Date(review.createdAt).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">هنوز نظری ثبت نشده است.</p>
            )}
          </div>

          {/* Hours */}
          <div className="order-3 lg:order-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              ساعات کاری
            </h2>
            <div className="space-y-2">
              {business.hours && business.hours.length > 0 ? (
                business.hours.map((h: any) => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                      h.isClosed ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    <span className="font-medium">
                      {getPersianDayName(h.day)}
                    </span>
                    <span>
                      {h.isClosed
                        ? "تعطیل"
                        : h.openTime && h.closeTime
                          ? `${formatTime(h.openTime)} - ${formatTime(h.closeTime)}`
                          : "ساعت ثبت نشده"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400 text-center py-2">
                  ساعات کاری ثبت نشده است.
                </div>
              )}
            </div>
          </div>

          {/* Owner */}
          <div className="order-4 lg:order-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              مالک فودتراک
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                {business.ownerAvatar ? (
                  <Image
                    src={business.ownerAvatar}
                    alt={business.ownerName || "مالک"}
                    width={40}
                    height={40}
                    sizes="40px"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <span className="font-medium text-gray-700">
                {business.ownerName || "ناشناس"}
              </span>
              {business.ownerPlan === "pro" && <VanjaPlusBadge />}
            </div>
          </div>

          {/* Photos */}
          <div className="order-5 lg:order-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">تصاویر</h2>
            {business.photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {business.photos.map((photo: any) => (
                  <button
                    key={photo.id}
                    onClick={() => setPreviewImage(photo.url)}
                    className="relative w-full h-24 rounded-lg overflow-hidden"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption || business.name}
                      fill
                      sizes="(max-width: 1024px) 45vw, 200px"
                      loading="lazy"
                      className="object-cover rounded-lg"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <ImageOff className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-400">
                  هنوز تصویری اضافه نشده است
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
      <ImageLightbox
        src={previewImage}
        alt={business.name}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
