import type { MetadataRoute } from "next";

const SITE_URL = (process.env.PUBLIC_APP_URL || "https://joinog.xyz").replace(/\/$/, "");

export const revalidate = 3600;

type StaticEntry = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const STATIC_ROUTES: StaticEntry[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/leaderboard", priority: 0.9, changeFrequency: "daily" },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
  { path: "/roadmap", priority: 0.8, changeFrequency: "monthly" },
  { path: "/agent-guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/try", priority: 0.6, changeFrequency: "monthly" },
  { path: "/og-card", priority: 0.6, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamic /u/[handle] — best-effort, never fails the build
  try {
    const { getLeaderboard } = await import("@/lib/public-profiles");
    // getLeaderboard caps at 100; for sitemap that's enough to seed
    // crawlers. Full enumeration would require a direct users query.
    const leaderboard = await getLeaderboard(1000).catch(() => []);
    const dynamicEntries: MetadataRoute.Sitemap = leaderboard
      .filter((p) => !!p.xHandle)
      .map((p) => ({
        url: `${SITE_URL}/u/${p.xHandle.replace(/^@/, "").toLowerCase()}`,
        lastModified: p.lastCalculatedAt ? new Date(p.lastCalculatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    return [...staticEntries, ...dynamicEntries];
  } catch {
    return staticEntries;
  }
}
