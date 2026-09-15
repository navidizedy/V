import { Navbar } from "@/components/navbar";
import { BackButton } from "@/components/back-button";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "سیاست حریم خصوصی ون جا و نحوه استفاده از اطلاعات کاربران.",
};

const sections = [
  { title: "۱. اطلاعاتی که جمع‌آوری می‌کنیم", text: "نام، ایمیل، شماره تماس و اطلاعات فودتراک شما هنگام ثبت‌نام و استفاده از پلتفرم جمع‌آوری می‌شود." },
  { title: "۲. نحوه استفاده از اطلاعات", text: "اطلاعات شما صرفاً برای ارائه خدمات بهتر، نمایش فودتراک‌ها و ارتباط با شما استفاده می‌شود و هرگز به اشخاص ثالث فروخته نمی‌شود." },
  { title: "۳. امنیت اطلاعات", text: "رمزهای عبور به‌صورت رمزنگاری‌شده ذخیره می‌شوند و تمام ارتباطات از طریق اتصال امن انجام می‌شود." },
  { title: "۴. کوکی‌ها", text: "ون جا از کوکی‌ها برای حفظ نشست ورود شما و بهبود تجربه کاربری استفاده می‌کند." },
  { title: "۵. حقوق کاربران", text: "شما می‌توانید در هر زمان درخواست حذف حساب کاربری و اطلاعات خود را از طریق صفحه تماس با ما ارسال کنید." },
];


export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">حریم خصوصی</h1>
          <p className="text-gray-500">آخرین به‌روزرسانی: ۱۴۰۴/۰۱/۰۱</p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-6">
        {sections.map((s) => (
          <div key={s.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-2">{s.title}</h2>
            <p className="text-sm text-gray-500 leading-7">{s.text}</p>
          </div>
        ))}
      </section>
      <Footer />
    </div>
  );
}
