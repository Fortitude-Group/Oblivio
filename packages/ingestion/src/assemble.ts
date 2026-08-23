import type {
  RepoActivity,
  ScoringInputs,
  HarmSignals,
} from "@observatory/scoring-engine";
import type { RegistryPackage } from "./registries/types";
import { NO_HARM } from "./repos/harm";

/**
 * Combine registry metadata, repo activity, and mined harm signals into scoring
 * inputs. When harm is not supplied (e.g. an unresolved or GitLab repo), it
 * defaults to none, which is conservative: absent harm can only keep a package
 * healthier, never falsely flag it (Gate A).
 */
export function buildScoringInputs(
  registry: RegistryPackage,
  repo: RepoActivity | null,
  asOf: string,
  harm: HarmSignals | null = null,
): ScoringInputs {
  return {
    asOf,
    latestReleaseAt: registry.latestReleaseAt,
    isDeprecated: registry.isDeprecated,
    downloadCount: registry.downloadCount,
    repo,
    harm: harm ?? NO_HARM,
  };
}
