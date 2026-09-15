import type { MetadataRoute } from "next";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/businesses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const allBusinesses = await db
      .select({ slug: businesses.slug, updatedAt: businesses.updatedAt })
      .from(businesses)
      .where(eq(businesses.status, "approved"));

    const businessRoutes: MetadataRoute.Sitemap = allBusinesses.map((b) => ({
      url: `${baseUrl}/businesses/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }));

    return [...staticRoutes, ...businessRoutes];
  } catch {
    return staticRoutes;
  }
}
