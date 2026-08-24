import type { MetadataRoute } from "next";
import { loadConfig } from "@observatory/config";
import { getScoredRows } from "../lib/data";

const CHUNK = 45000;

// Generated at request time, not at build: it reads the scored universe, and
// baking that into the build makes the prerender contend for the serverless DB
// connection. It is a single cheap query per request.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = loadConfig().baseUrl;
  const rows = await getScoredRows();
  const chunks = Math.max(1, Math.ceil(rows.length / CHUNK));
  // Chunked sitemaps live at /sitemap/{id}.xml; list them all in robots.
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: Array.from({ length: chunks }, (_, id) => `${base}/sitemap/${id}.xml`),
  };
}
