import type { MetadataRoute } from "next";
import { SITE_URL, THEORY_READING_URL, SITE_UPDATED_AT } from "@/lib/schema-ld";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: SITE_UPDATED_AT,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: THEORY_READING_URL,
      lastModified: SITE_UPDATED_AT,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
