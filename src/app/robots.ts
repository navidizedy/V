import type { MetadataRoute } from "next";
import { siteUrl, isCanonicalHost } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Keep preview/test deploys out of Google entirely.
  if (!isCanonicalHost) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
