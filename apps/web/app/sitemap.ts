import type { MetadataRoute } from "next";
import { loadConfig } from "@observatory/config";
import { ECOSYSTEMS } from "@observatory/core";
import { getScoredRows } from "../lib/data";
import { LEADERBOARDS } from "../lib/leaderboards";

// Sitemaps cap at 50k URLs each, so chunk the package pages. At the current
// scale this is a single chunk; it grows to a sitemap index automatically as the
// universe reaches tens of thousands of packages (FR-016).
const CHUNK = 45000;

// Generated at request time, not at build. The sitemap reads the whole scored
// universe; prerendering every chunk during the build makes them contend for the
// single serverless DB connection and time out. At runtime each request gets its
// own connection and the query is cheap.
export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  const rows = await getScoredRows();
  const chunks = Math.max(1, Math.ceil(rows.length / CHUNK));
  return Array.from({ length: chunks }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const base = loadConfig().baseUrl;
  const rows = await getScoredRows();

  const packageRoutes: MetadataRoute.Sitemap = rows
    .slice(id * CHUNK, (id + 1) * CHUNK)
    .map((r) => ({
      url: `${base}/${r.ecosystem}/${encodeURIComponent(r.name)}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  if (id !== 0) return packageRoutes;

  // The first chunk also carries the fixed routes.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/lists`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/api-docs`, changeFrequency: "monthly", priority: 0.5 },
    ...ECOSYSTEMS.map((e) => ({
      url: `${base}/${e}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...LEADERBOARDS.map((l) => ({
      url: `${base}/lists/${l.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
  return [...staticRoutes, ...packageRoutes];
}
