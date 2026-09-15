import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  images: {
    // Serve modern formats; AVIF first for the biggest byte savings on mobile.
    formats: ["image/avif", "image/webp"],
    // Card thumbnails / avatars on mobile are small — allow tighter sizes so the
    // browser doesn't download a 640px image for a 56px logo.
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 192, 256, 384],
    // Optimized copies of user-uploaded images (served from /api/images/...) can be
    // cached for a long time — their URLs are versioned with `?v=<updatedAt>`.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Local images with a query string are blocked by default. Our DB-backed images
    // live under /api/images/** and carry a `?v=` cache-busting version, so allow them
    // explicitly; everything else in /public must have no query string.
    localPatterns: [
      { pathname: "/api/images/**" },
      { pathname: "/**", search: "" },
    ],
  },

  experimental: {
    // Tree-shake barrel imports so only the icons actually used ship to the client.
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  async headers() {
    return [
      {
        // Long-lived caching for immutable public assets.
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
