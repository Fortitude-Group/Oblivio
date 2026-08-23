import type { Ecosystem } from "@observatory/core";

/** Normalised registry metadata for one package (data-model: Package facts). */
export interface RegistryPackage {
  ecosystem: Ecosystem;
  name: string;
  latestVersion: string | null;
  latestReleaseAt: string | null; // ISO
  releaseDates: string[]; // ISO, ascending
  downloadCount: number; // last-month, best-effort
  declaredRepoUrl: string | null;
  declaredLicense: string | null;
  isDeprecated: boolean;
  /** Direct runtime dependency names (for building the dependency graph). */
  dependencies: string[];
}

export type FetchFn = typeof fetch;

export interface RegistryAdapter {
  ecosystem: Ecosystem;
  fetchPackage(
    name: string,
    fetchFn?: FetchFn,
  ): Promise<RegistryPackage | null>;
}
