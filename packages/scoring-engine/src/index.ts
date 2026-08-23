import type { ScoreResult, ScoringInputs, SignalBreakdownEntry } from "./types";
import { ACTIVITY_SIGNALS } from "./signals/activity";
import { evaluateHarm } from "./signals/harm";
import {
  SIGNAL_CATALOGUE,
  confidenceOf,
  mapVerdict,
  weightedScore,
} from "./rubric";

const REPO_SOURCE = "resolved source repository";

/**
 * Score a single package's maintenance health.
 *
 * Pure and deterministic: identical `inputs` always yield an identical result
 * (Principle IV). No I/O, no clock reads, no randomness. The caller snapshots
 * inputs (including `asOf`) and passes them in.
 *
 * Guarantees (see the contract tests):
 *  - `overallScore` equals the weighted sum of the activity signals (Gate B).
 *  - A missing repository yields `insufficient_data` with `overallScore: null`,
 *    never a fabricated low number (spec FR-007/032).
 *  - With no harm signals present, the verdict is never worse than
 *    `stable_low_activity`, however quiet the package (spec FR-008, Gate A).
 */
export function scorePackage(inputs: ScoringInputs): ScoreResult {
  const harm = evaluateHarm(inputs);

  const activityEntries: SignalBreakdownEntry[] = ACTIVITY_SIGNALS.map((s) => {
    const sample = s.compute(inputs);
    return {
      key: s.def.key,
      rawValue: sample.rawValue,
      subScore: sample.subScore,
      weight: s.def.weight,
      kind: "activity" as const,
      sourceRef: REPO_SOURCE,
    };
  });

  const signals = [...activityEntries, ...harm.entries];

  // Hard overrides: no publishable number.
  if (inputs.repo === null) {
    return {
      verdict: "insufficient_data",
      overallScore: null,
      confidence: "insufficient_data",
      signals,
    };
  }
  if (inputs.repo.isArchived || inputs.isDeprecated) {
    return {
      verdict: "archived",
      overallScore: null,
      confidence: confidenceOf(inputs),
      signals,
    };
  }

  const overallScore = weightedScore(activityEntries);
  const verdict = mapVerdict(overallScore, harm.present);

  return {
    verdict,
    overallScore,
    confidence: confidenceOf(inputs),
    signals,
  };
}

export { SIGNAL_CATALOGUE } from "./rubric";
export type {
  ScoringInputs,
  ScoreResult,
  RepoActivity,
  HarmSignals,
  SignalBreakdownEntry,
  SignalDefinition,
} from "./types";
