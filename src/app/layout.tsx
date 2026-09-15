import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Vazirmatn } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";
import { WebVitals } from "./web-vitals";
import { siteUrl } from "@/lib/site";

// Vazirmatn is a variable font: omitting `weight` makes next/font download ONE
// variable file (all weights 100–900) instead of seven separate static files.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "ون جا | اولین پلتفرم تخصصی فودتراک‌های ایران",
    template: "%s | ون جا",
  },

  description:
    "ون جا، اولین پلتفرم تخصصی فودتراک‌های ایران. فودتراک‌های اطرافت رو پیدا کن، ببین امروز کجان، منو و قیمت‌ها رو ببین و نظر بده. صاحب فودتراکی؟ همین الان رایگان ثبت کن.",

  keywords: [
    "فودتراک",
    "فود ترک",
    "غذای خیابانی",
    "فودتراک تهران",
    "برگر",
    "کباب",
    "پیتزا",
    "ساندویچ",
    "فلافل",
    "ون جا",
    "vanja",
    "غذای خیابانی ایران",
    "غذای سریع",
    "فست فود",
  ],

  authors: [
    {
      name: "Van Ja",
      url: siteUrl,
    },
  ],

  creator: "Van Ja",
  publisher: "Van Ja",

  openGraph: {
    title: "ون جا | اولین پلتفرم تخصصی فودتراک‌های ایران",

    description:
      "فودتراک‌های اطرافت رو پیدا کن، ببین امروز کجان، منو و قیمت‌ها رو ببین. یا صاحب فودتراکی؟ رایگان ثبت کن.",

    type: "website",
    locale: "fa_IR",
    siteName: "ون جا",
    url: siteUrl,

    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ون جا - پلتفرم فودتراک‌های ایران",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "ون جا | اولین پلتفرم تخصصی فودتراک‌های ایران",

    description:
      "فودتراک‌های اطرافت رو پیدا کن، ببین امروز کجان، منو و قیمت‌ها رو ببین. یا صاحب فودتراکی؟ رایگان ثبت کن.",

    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "/",
  },

  // NOTE: no `icons` block here on purpose. File-based metadata
  // (app/favicon.ico, app/icon.png, app/apple-icon.png) overrides this
  // config, so defining icons in both places silently drops these.
  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "ون جا",
    statusBarStyle: "default",
  },

  category: "food",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f97316",
  viewportFit: "cover",
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",

  name: "ون جا",
  alternateName: ["Van Ja", "ونجا"],
  url: siteUrl,

  description:
    "اولین پلتفرم تخصصی فودتراک‌های ایران. فودتراک‌های اطرافت رو پیدا کن، ببین امروز کجان، منو و قیمت‌ها رو ببین.",

  inLanguage: "fa-IR",

  potentialAction: {
    "@type": "SearchAction",

    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/businesses?search={search_term_string}`,
    },

    "query-input": "required name=search_term_string",
  },

  publisher: {
    "@type": "Organization",

    name: "ون جا",

    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo-vanja.svg`,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
        <WebVitals />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </body>
    </html>
  );
}
