import type { MetadataRoute } from "next";

const SITE_URL = (process.env.PUBLIC_APP_URL || "https://joinog.xyz").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/dashboard", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
