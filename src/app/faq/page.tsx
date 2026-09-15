import { Navbar } from "@/components/navbar";
import { BackButton } from "@/components/back-button";
import { Footer } from "@/components/footer";
import { faqs } from "@/lib/faqs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description: "پاسخ به پرتکرارترین سوالات درباره ون جا، ثبت فودتراک و استفاده از پلتفرم.",
};


export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <div className="mb-6 md:hidden text-right"><BackButton fallback="/" /></div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">سوالات متداول</h1>
          <p className="text-gray-500">هر چیزی که باید درباره ون جا بدانید</p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5 rounded-2xl bg-white border border-gray-100 shadow-sm open:shadow-md transition-shadow">
            <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
              {f.q}
              <span className="text-primary text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-gray-500 leading-7 mt-3">{f.a}</p>
          </details>
        ))}
      </section>
      <Footer />
    </div>
  );
}
