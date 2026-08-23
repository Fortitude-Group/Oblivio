import type { MetadataRoute } from "next";
import { loadConfig } from "@observatory/config";
import { ECOSYSTEMS } from "@observatory/core";
import { getScoredRows } from "../lib/data";
import { LEADERBOARDS } from "../lib/leaderboards";

/**
 * XML sitemap covering the whole universe (FR-016). One file is ample at the
 * current scale; at ~50k+ URLs this becomes a sitemap index with chunked
 * children, which Next supports via generateSitemaps.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cfg = loadConfig();
  const base = cfg.baseUrl;
  const rows = await getScoredRows();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/methodology`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/lists`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const ecosystemRoutes: MetadataRoute.Sitemap = ECOSYSTEMS.map((e) => ({
    url: `${base}/${e}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const listRoutes: MetadataRoute.Sitemap = LEADERBOARDS.map((l) => ({
    url: `${base}/lists/${l.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const packageRoutes: MetadataRoute.Sitemap = rows.map((r) => ({
    url: `${base}/${r.ecosystem}/${r.name}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...ecosystemRoutes, ...listRoutes, ...packageRoutes];
}
