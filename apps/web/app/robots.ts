import type { MetadataRoute } from "next";
import { loadConfig } from "@observatory/config";

export default function robots(): MetadataRoute.Robots {
  const cfg = loadConfig();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${cfg.baseUrl}/sitemap.xml`,
  };
}
