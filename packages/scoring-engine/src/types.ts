import type { Verdict, Confidence, TrendDirection } from "@observatory/core";

/**
 * Repository activity, snapshotted by the caller. All timestamps are ISO
 * strings; the engine never reads a clock (determinism, Principle IV). `null`
 * means the value could not be resolved.
 */
export interface RepoActivity {
  lastCommitAt: string | null;
  /** Recent commit-count buckets, oldest first. */
  commitActivitySeries: number[];
  /** Release timestamps, oldest first. */
  releaseDates: string[];
  openIssues: number;
  medianIssueResponseHours: number | null;
  /** Issue-response latency buckets (hours), oldest first (lower is healthier). */
  issueResponseSeries: number[];
  openPrs: number;
  medianPrMergeHours: number | null;
  /** Open-PR backlog size buckets, oldest first. */
  openPrBacklogSeries: number[];
  contributorCount: number;
  busFactor: number;
  /** Share of contributions from the single top contributor, 0..1. */
  topContributorShare: number;
  lastActiveMaintainerAt: string | null;
  isArchived: boolean;
}

/**
 * Dependent-facing harm signals. These, not raw commit silence, are what make a
 * package "at risk" (spec FR-008, the fairness linchpin).
 */
export interface HarmSignals {
  unansweredSecurityIssues: number;
  dependentBreakageReports: number;
  neglectedOpenPrs: number;
  semverStagnationWithOpenBugs: boolean;
  lookingForMaintainer: boolean;
}

/** The complete, snapshotted input to a scoring run. No live fetches. */
export interface ScoringInputs {
  /** Freshness time for these inputs; carried through, never used in the maths. */
  asOf: string;
  latestReleaseAt: string | null;
  isDeprecated: boolean;
  downloadCount: number;
  /** `null` when the repository is unresolvable → insufficient_data. */
  repo: RepoActivity | null;
  harm: HarmSignals;
}

/** A signal's static definition. The catalogue is code-canonical (data-model F1). */
export interface SignalDefinition {
  key: string;
  displayName: string;
  description: string;
  /** Global weight; activity weights sum to 1. Harm signals have weight 0. */
  weight: number;
  kind: "activity" | "harm";
  /** Higher raw value is healthier, or riskier. */
  direction: "higher_healthier" | "higher_riskier";
}

/** One line of the decomposed score (Gate B / Principle XII). */
export interface SignalBreakdownEntry {
  key: string;
  rawValue: number | null;
  /** Normalised 0..1 where 1 is healthiest. Harm entries report 0. */
  subScore: number;
  weight: number;
  kind: "activity" | "harm";
  sourceRef: string;
}

export interface ScoreResult {
  verdict: Verdict;
  /** 0..100, or `null` for archived / insufficient_data. */
  overallScore: number | null;
  confidence: Confidence;
  signals: SignalBreakdownEntry[];
  /** Set by the caller from history, not by the pure function. */
  trendDirection?: TrendDirection;
}
