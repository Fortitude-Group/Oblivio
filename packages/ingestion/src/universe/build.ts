import type { Ecosystem } from "@observatory/core";
import { getRegistryAdapter } from "../registries";
import type { RegistryPackage } from "../registries/types";
import { transitiveDependentsCounts, type Edge } from "./graph";

export interface UniverseMemberBuild {
  name: string;
  registry: RegistryPackage;
  transitiveDependents: number;
  rank: number;
}

export interface UniverseBuildResult {
  members: UniverseMemberBuild[];
  edges: Edge[];
}

/** The definition version this ranking was produced under (for reproducibility). */
export const CRITERIA_VERSION = "transitive-dependents-v1";

/**
 * Build a working universe for one ecosystem from a seed set of package names.
 *
 * Fetches each package's registry metadata (dependencies + downloads), builds the
 * dependency graph restricted to the seed, computes transitive dependents, and
 * ranks by that count with download count as the tiebreak (FR-003, confirmed in
 * the spec's clarifications). The seed is the current working set; scaling it
 * toward the whole registry is a data-pipeline concern, not a change to this
 * algorithm.
 */
export async function buildUniverse(
  ecosystem: Ecosystem,
  seed: string[],
  fetchFn: typeof fetch = fetch,
): Promise<UniverseBuildResult> {
  const adapter = getRegistryAdapter(ecosystem);
  const set = new Set(seed);
  const registries = new Map<string, RegistryPackage>();

  for (const name of seed) {
    try {
      const rp = await adapter.fetchPackage(name, fetchFn);
      if (rp) registries.set(name, rp);
    } catch {
      // A single unreachable package must not sink the whole build.
    }
  }

  const nodes = [...registries.keys()];
  const edges: Edge[] = [];
  for (const [name, rp] of registries) {
    for (const dep of rp.dependencies) {
      if (dep !== name && set.has(dep)) edges.push({ from: name, to: dep });
    }
  }

  const counts = transitiveDependentsCounts(nodes, edges);
  const members = nodes
    .map((name) => ({
      name,
      registry: registries.get(name)!,
      transitiveDependents: counts.get(name) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.transitiveDependents - a.transitiveDependents ||
        b.registry.downloadCount - a.registry.downloadCount,
    )
    .map((m, i) => ({ ...m, rank: i + 1 }));

  return { members, edges };
}
