import type { RegistryAdapter, RegistryPackage, FetchFn } from "./types";

interface NpmDoc {
  "dist-tags"?: { latest?: string };
  versions?: Record<
    string,
    {
      deprecated?: string;
      license?: string;
      dependencies?: Record<string, string>;
    }
  >;
  time?: Record<string, string>;
  repository?: { url?: string } | string;
  license?: string | { type?: string };
  homepage?: string;
}

/** Pure mapping from the npm registry document (+ download count) to our shape. */
export function mapNpm(
  name: string,
  doc: NpmDoc,
  downloadCount: number,
): RegistryPackage {
  const latest = doc["dist-tags"]?.latest ?? null;
  const time = doc.time ?? {};
  const releaseDates = Object.entries(time)
    .filter(([k]) => k !== "created" && k !== "modified")
    .map(([, v]) => v)
    .sort();
  const repoUrl =
    typeof doc.repository === "string"
      ? doc.repository
      : (doc.repository?.url ?? doc.homepage ?? null);
  const license =
    typeof doc.license === "string" ? doc.license : (doc.license?.type ?? null);
  const latestVer = latest ?? undefined;
  const dependencies = latestVer
    ? Object.keys(doc.versions?.[latestVer]?.dependencies ?? {})
    : [];
  return {
    ecosystem: "npm",
    name,
    latestVersion: latest,
    latestReleaseAt: latestVer ? (time[latestVer] ?? null) : null,
    releaseDates,
    downloadCount,
    declaredRepoUrl: repoUrl,
    declaredLicense: license,
    isDeprecated: latestVer
      ? Boolean(doc.versions?.[latestVer]?.deprecated)
      : false,
    dependencies,
  };
}

export const npmAdapter: RegistryAdapter = {
  ecosystem: "npm",
  async fetchPackage(name, fetchFn: FetchFn = fetch) {
    const res = await fetchFn(
      `https://registry.npmjs.org/${encodeURIComponent(name)}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`npm registry ${res.status} for ${name}`);
    const doc = (await res.json()) as NpmDoc;

    let downloads = 0;
    try {
      const dRes = await fetchFn(
        `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(name)}`,
      );
      if (dRes.ok) {
        const d = (await dRes.json()) as { downloads?: number };
        downloads = d.downloads ?? 0;
      }
    } catch {
      // Download stats are best-effort; a failure must not sink ingestion.
    }
    return mapNpm(name, doc, downloads);
  },
};
