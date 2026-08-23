import type { HarmSignals } from "@observatory/scoring-engine";

/**
 * Harm-signal mining from repository metadata.
 *
 * Deliberately CONSERVATIVE. The fairness rule (Gate A) means a false harm
 * signal turns a finished-but-healthy package (lodash, say) into "at risk",
 * which discredits the whole site. So we mine only the two signals that are both
 * specific and low-false-positive:
 *
 *  - lookingForMaintainer: an explicit, rare, self-declared status.
 *  - unansweredSecurityIssues: open security-labelled issues with no response.
 *
 * The remaining harm signals (dependent-breakage reports, neglected-PR judgement,
 * semver stagnation with confirmed bugs) are NOT mined here: cheap proxies for
 * them (e.g. "no release in a year and has any open bug") fire on healthy mature
 * packages and would break fairness. They need dependent-graph data / issue
 * triage and are a later increment. Until then they stay zero/false.
 */

const LFM_RE =
  /\b(unmaintained|no longer maintained|not maintained|looking for (a )?maintainer|seeking (a )?maintainer|maintainer wanted|abandonware|abandoned|deprecated)\b/i;
const LFM_TOPIC_RE =
  /unmaintained|deprecated|abandoned|looking-for-maintainer|maintainer-wanted/i;

export function isLookingForMaintainer(
  description: string | null,
  topics: string[],
  disabled: boolean,
): boolean {
  if (disabled) return true;
  if (description && LFM_RE.test(description)) return true;
  return topics.some((t) => LFM_TOPIC_RE.test(t));
}

export interface IssueLike {
  comments: number;
  pull_request?: unknown;
}

/** Open, security-labelled, non-PR issues with zero maintainer engagement. */
export function countUnansweredSecurity(issues: IssueLike[]): number {
  return issues.filter((i) => !i.pull_request && i.comments === 0).length;
}

export function mineHarm(params: {
  description: string | null;
  topics: string[];
  disabled: boolean;
  securityIssues: IssueLike[];
}): HarmSignals {
  return {
    unansweredSecurityIssues: countUnansweredSecurity(params.securityIssues),
    dependentBreakageReports: 0,
    neglectedOpenPrs: 0,
    semverStagnationWithOpenBugs: false,
    lookingForMaintainer: isLookingForMaintainer(
      params.description,
      params.topics,
      params.disabled,
    ),
  };
}

export const NO_HARM: HarmSignals = {
  unansweredSecurityIssues: 0,
  dependentBreakageReports: 0,
  neglectedOpenPrs: 0,
  semverStagnationWithOpenBugs: false,
  lookingForMaintainer: false,
};
