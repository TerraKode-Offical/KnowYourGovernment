import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/api/cron/", "/api/ai/"],
      },
    ],
    sitemap: "https://knowyourgov.us/sitemap.xml",
  };
}
