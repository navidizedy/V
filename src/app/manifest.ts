import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ون جا | پلتفرم فودتراک‌های ایران",
    short_name: "ون جا",
    description: "اولین پلتفرم تخصصی فودتراک‌های ایران",

    start_url: "/",
    scope: "/",

    display: "standalone",

    background_color: "#ffffff",
    theme_color: "#f97316",

    lang: "fa",
    dir: "rtl",

    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
