import type { Ecosystem } from "@observatory/core";

/** ecosyste.ms registry hostnames per ecosystem. */
const REGISTRY: Record<Ecosystem, string> = {
  npm: "npmjs.org",
  pypi: "pypi.org",
  nuget: "nuget.org",
};

export interface TopPackage {
  name: string;
  dependentCount: number;
}

/**
 * Fetch the top-N most-depended-on packages for an ecosystem from ecosyste.ms
 * (a free, open cross-ecosystem index), ranked server-side by dependent-package
 * count. This is how the universe scales past a hand-written seed to the real
 * long tail (FR-003): the returned order IS the ranking, and each package is
 * then ingested and scored by the pipeline at its cadence.
 */
export async function fetchMostDependedOn(
  ecosystem: Ecosystem,
  n: number,
  fetchFn: typeof fetch = fetch,
): Promise<TopPackage[]> {
  const registry = REGISTRY[ecosystem];
  const perPage = 100;
  const pages = Math.ceil(n / perPage);
  const out: TopPackage[] = [];

  for (let page = 1; page <= pages && out.length < n; page++) {
    const url =
      `https://packages.ecosyste.ms/api/v1/registries/${registry}/packages` +
      `?sort=dependent_packages_count&order=desc&per_page=${perPage}&page=${page}`;
    const res = await fetchFn(url, {
      headers: { "User-Agent": "observatory-ingest" },
    });
    if (!res.ok) break;
    const arr = (await res.json()) as Array<{
      name?: string;
      dependent_packages_count?: number;
    }>;
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const p of arr) {
      if (p.name) {
        out.push({
          name: p.name,
          dependentCount: p.dependent_packages_count ?? 0,
        });
      }
      if (out.length >= n) break;
    }
  }
  return out;
}
