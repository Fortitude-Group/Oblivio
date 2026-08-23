import type { RegistryAdapter, RegistryPackage, FetchFn } from "./types";

interface PypiDoc {
  info?: {
    version?: string;
    home_page?: string;
    project_urls?: Record<string, string> | null;
    license?: string;
    requires_dist?: string[] | null;
  };
  releases?: Record<string, Array<{ upload_time_iso_8601?: string }>>;
}

/** Parse dependency names from PyPI requires_dist, skipping optional extras. */
export function parseRequiresDist(reqs: string[] | null | undefined): string[] {
  if (!reqs) return [];
  const names = new Set<string>();
  for (const entry of reqs) {
    if (/;\s*extra\s*==/.test(entry)) continue; // optional extra
    const m = /^([A-Za-z0-9._-]+)/.exec(entry.trim());
    if (m) names.add(m[1]!.toLowerCase());
  }
  return [...names];
}

/** Pick the most repo-like URL from PyPI's project_urls / home_page. */
export function pickRepoUrl(info: PypiDoc["info"]): string | null {
  const urls = info?.project_urls ?? {};
  const values = Object.values(urls);
  const repoish = values.find((u) => /github\.com|gitlab\.com/.test(u)) ?? null;
  if (repoish) return repoish;
  if (info?.home_page && /github\.com|gitlab\.com/.test(info.home_page)) {
    return info.home_page;
  }
  return info?.home_page ?? null;
}

/** Pure mapping from the PyPI JSON document (+ recent downloads) to our shape. */
export function mapPypi(
  name: string,
  doc: PypiDoc,
  downloadCount: number,
): RegistryPackage {
  const version = doc.info?.version ?? null;
  const releases = doc.releases ?? {};
  const releaseDates: string[] = [];
  for (const files of Object.values(releases)) {
    const first = files.find(
      (f) => f.upload_time_iso_8601,
    )?.upload_time_iso_8601;
    if (first) releaseDates.push(first);
  }
  releaseDates.sort();
  const latestReleaseAt = version
    ? (releases[version]?.find((f) => f.upload_time_iso_8601)
        ?.upload_time_iso_8601 ?? null)
    : null;
  return {
    ecosystem: "pypi",
    name,
    latestVersion: version,
    latestReleaseAt,
    releaseDates,
    downloadCount,
    declaredRepoUrl: pickRepoUrl(doc.info),
    declaredLicense: doc.info?.license ?? null,
    isDeprecated: false, // PyPI has no package-level deprecation flag
    dependencies: parseRequiresDist(doc.info?.requires_dist),
  };
}

export const pypiAdapter: RegistryAdapter = {
  ecosystem: "pypi",
  async fetchPackage(name, fetchFn: FetchFn = fetch) {
    const res = await fetchFn(
      `https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`pypi ${res.status} for ${name}`);
    const doc = (await res.json()) as PypiDoc;

    let downloads = 0;
    try {
      const dRes = await fetchFn(
        `https://pypistats.org/api/packages/${encodeURIComponent(
          name.toLowerCase(),
        )}/recent`,
      );
      if (dRes.ok) {
        const d = (await dRes.json()) as { data?: { last_month?: number } };
        downloads = d.data?.last_month ?? 0;
      }
    } catch {
      // Best-effort.
    }
    return mapPypi(name, doc, downloads);
  },
};
