import type { RegistryAdapter, RegistryPackage, FetchFn } from "./types";

const FLAT = "https://api.nuget.org/v3-flatcontainer";
const REG = "https://api.nuget.org/v3/registration5-gz-semver2";
const SEARCH =
  "https://azuresearch-usnc.nuget.org/query?prerelease=false&semVerLevel=2.0.0&q=packageid:";

/** Latest stable (non-prerelease) version, or the last version if all are pre. */
export function latestStable(versions: string[]): string | null {
  if (versions.length === 0) return null;
  const stable = versions.filter((v) => !v.includes("-"));
  return (stable.length > 0 ? stable : versions).at(-1) ?? null;
}

export interface NuspecInfo {
  repoUrl: string | null;
  projectUrl: string | null;
  license: string | null;
  dependencies: string[];
}

/** Parse the fields we need from a .nuspec XML document (no XML dep needed). */
export function parseNuspec(xml: string): NuspecInfo {
  const repoUrl = /<repository[^>]*\burl="([^"]+)"/i.exec(xml)?.[1] ?? null;
  const projectUrl =
    /<projectUrl>([^<]+)<\/projectUrl>/i.exec(xml)?.[1] ?? null;
  const licenseExpr = /<license\s+type="expression">([^<]+)<\/license>/i.exec(
    xml,
  )?.[1];
  const licenseUrl = /<licenseUrl>([^<]+)<\/licenseUrl>/i.exec(xml)?.[1];
  const license = licenseExpr ?? (licenseUrl ? "See licence URL" : null);
  const dependencies = [...xml.matchAll(/<dependency\s+id="([^"]+)"/gi)].map(
    (m) => m[1]!,
  );
  return {
    repoUrl,
    projectUrl,
    license,
    dependencies: [...new Set(dependencies)],
  };
}

interface RegLeaf {
  catalogEntry?: {
    version?: string;
    published?: string;
    deprecation?: unknown;
  };
}

async function fetchRegistration(
  idLower: string,
  fetchFn: FetchFn,
): Promise<{ byVersion: Record<string, string>; deprecated: Set<string> }> {
  const byVersion: Record<string, string> = {};
  const deprecated = new Set<string>();
  try {
    const res = await fetchFn(`${REG}/${idLower}/index.json`);
    if (!res.ok) return { byVersion, deprecated };
    const idx = (await res.json()) as {
      items?: Array<{ items?: RegLeaf[]; "@id"?: string }>;
    };
    const pages = idx.items ?? [];
    const leaves: RegLeaf[] = [];
    for (const page of pages) if (page.items) leaves.push(...page.items);
    // Large packages page their leaves out; fetch the last page for recent dates.
    if (leaves.length === 0 && pages.length > 0) {
      const last = pages[pages.length - 1];
      if (last?.["@id"]) {
        const p = (await (await fetchFn(last["@id"])).json()) as {
          items?: RegLeaf[];
        };
        if (p.items) leaves.push(...p.items);
      }
    }
    for (const leaf of leaves) {
      const ce = leaf.catalogEntry;
      if (ce?.version && ce.published && !ce.published.startsWith("1900")) {
        byVersion[ce.version] = ce.published;
        if (ce.deprecation) deprecated.add(ce.version);
      }
    }
  } catch {
    // Dates are best-effort; a registration failure must not sink ingestion.
  }
  return { byVersion, deprecated };
}

export const nugetAdapter: RegistryAdapter = {
  ecosystem: "nuget",
  async fetchPackage(name, fetchFn: FetchFn = fetch) {
    const idLower = name.toLowerCase();

    const verRes = await fetchFn(`${FLAT}/${idLower}/index.json`);
    if (verRes.status === 404) return null;
    if (!verRes.ok) throw new Error(`nuget flatcontainer ${verRes.status}`);
    const versions =
      ((await verRes.json()) as { versions?: string[] }).versions ?? [];
    const latest = latestStable(versions);

    let nuspec: NuspecInfo = {
      repoUrl: null,
      projectUrl: null,
      license: null,
      dependencies: [],
    };
    if (latest) {
      try {
        const n = await fetchFn(
          `${FLAT}/${idLower}/${latest.toLowerCase()}/${idLower}.nuspec`,
        );
        if (n.ok) nuspec = parseNuspec(await n.text());
      } catch {
        // best-effort
      }
    }

    const { byVersion, deprecated } = await fetchRegistration(idLower, fetchFn);
    const releaseDates = Object.values(byVersion).sort();
    const latestReleaseAt = latest ? (byVersion[latest] ?? null) : null;

    let downloadCount = 0;
    try {
      const sRes = await fetchFn(`${SEARCH}${encodeURIComponent(name)}`);
      if (sRes.ok) {
        const s = (await sRes.json()) as {
          data?: Array<{ totalDownloads?: number }>;
        };
        downloadCount = s.data?.[0]?.totalDownloads ?? 0;
      }
    } catch {
      // best-effort
    }

    return {
      ecosystem: "nuget",
      name,
      latestVersion: latest,
      latestReleaseAt,
      releaseDates,
      downloadCount,
      declaredRepoUrl: nuspec.repoUrl ?? nuspec.projectUrl,
      declaredLicense: nuspec.license,
      isDeprecated: latest ? deprecated.has(latest) : false,
      dependencies: nuspec.dependencies,
    } satisfies RegistryPackage;
  },
};
