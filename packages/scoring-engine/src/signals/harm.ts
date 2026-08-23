import type {
  ScoringInputs,
  SignalBreakdownEntry,
  SignalDefinition,
} from "../types";

/**
 * Harm signals. These are what separate "finished and stable" from "rotting and
 * at risk" (spec FR-008). They carry weight 0 in the numeric score but act as
 * overrides in the verdict: with none of them present, a package is never worse
 * than "stable, low activity", however quiet its commit history.
 */
export const HARM_SIGNALS: SignalDefinition[] = [
  {
    key: "unanswered_security_issues",
    displayName: "Unanswered security issues",
    description: "Open security-labelled issues with no maintainer response.",
    weight: 0,
    kind: "harm",
    direction: "higher_riskier",
  },
  {
    key: "dependent_breakage_reports",
    displayName: "Dependent breakage reports",
    description: "Reports that the package is breaking its dependents.",
    weight: 0,
    kind: "harm",
    direction: "higher_riskier",
  },
  {
    key: "neglected_open_prs",
    displayName: "Neglected open PRs",
    description:
      "Substantive pull requests left without review for a long time.",
    weight: 0,
    kind: "harm",
    direction: "higher_riskier",
  },
  {
    key: "semver_stagnation_open_bugs",
    displayName: "Semver stagnation with open bugs",
    description:
      "No releases despite confirmed open bugs affecting dependents.",
    weight: 0,
    kind: "harm",
    direction: "higher_riskier",
  },
  {
    key: "looking_for_maintainer",
    displayName: "Looking for maintainer",
    description: "The project has explicitly asked for a new maintainer.",
    weight: 0,
    kind: "harm",
    direction: "higher_riskier",
  },
];

const SOURCE = "repository issues, pull requests, and metadata";

export interface HarmResult {
  present: boolean;
  entries: SignalBreakdownEntry[];
}

/** Evaluate harm signals into decomposable entries and a present/absent flag. */
export function evaluateHarm(i: ScoringInputs): HarmResult {
  const h = i.harm;
  const entries: SignalBreakdownEntry[] = [
    entry("unanswered_security_issues", h.unansweredSecurityIssues),
    entry("dependent_breakage_reports", h.dependentBreakageReports),
    entry("neglected_open_prs", h.neglectedOpenPrs),
    entry(
      "semver_stagnation_open_bugs",
      h.semverStagnationWithOpenBugs ? 1 : 0,
    ),
    entry("looking_for_maintainer", h.lookingForMaintainer ? 1 : 0),
  ];
  const present =
    h.unansweredSecurityIssues > 0 ||
    h.dependentBreakageReports > 0 ||
    h.neglectedOpenPrs > 0 ||
    h.semverStagnationWithOpenBugs ||
    h.lookingForMaintainer;
  return { present, entries };
}

function entry(key: string, rawValue: number): SignalBreakdownEntry {
  return {
    key,
    rawValue,
    subScore: 0,
    weight: 0,
    kind: "harm",
    sourceRef: SOURCE,
  };
}
