import { Navbar } from "@/components/navbar";
import { BackButton } from "@/components/back-button";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "قوانین و مقررات",
  description: "قوانین و مقررات استفاده از پلتفرم ون جا.",
};

const sections = [
  { title: "۱. پذیرش قوانین", text: "با استفاده از ون جا، شما می‌پذیرید که به این قوانین و مقررات پایبند باشید. در صورت عدم موافقت، لطفاً از پلتفرم استفاده نکنید." },
  { title: "۲. ثبت فودتراک", text: "صاحبان فودتراک موظف‌اند اطلاعات صحیح و به‌روز از جمله موقعیت، ساعت کاری و قیمت‌ها را ارائه دهند. ون جا حق بررسی و رد هر فودتراکی که اطلاعات نادرست ارائه دهد را دارد." },
  { title: "۳. محتوای کاربران", text: "نظرات و امتیازات باید واقعی، محترمانه و مرتبط با تجربه کاربر باشد. محتوای توهین‌آمیز، تبلیغاتی یا نامرتبط حذف خواهد شد." },
  { title: "۴. مسئولیت‌ها", text: "ون جا صرفاً نقش واسط بین فودتراک‌های سیار و کاربران را دارد و مسئولیتی در قبال کیفیت محصولات یا خدمات فودتراک‌ها ندارد." },
  { title: "۵. تعلیق حساب", text: "ون جا حق دارد در صورت تخلف از قوانین، حساب کاربری یا فودتراک را معلق یا حذف کند." },
  { title: "۶. تغییرات قوانین", text: "این قوانین ممکن است به‌مرور به‌روزرسانی شود. استفاده مستمر از ون جا به‌منزله پذیرش تغییرات است." },
];


export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">قوانین و مقررات</h1>
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
