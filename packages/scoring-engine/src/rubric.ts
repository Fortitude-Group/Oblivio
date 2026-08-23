import type { Verdict, Confidence } from "@observatory/core";
import type {
  ScoringInputs,
  SignalBreakdownEntry,
  SignalDefinition,
} from "./types";
import { ACTIVITY_SIGNALS } from "./signals/activity";
import { HARM_SIGNALS } from "./signals/harm";

/** Verdict thresholds over the 0..100 weighted activity score. */
export const ACTIVE_THRESHOLD = 65;
export const AT_RISK_THRESHOLD = 35;

/**
 * The code-canonical signal catalogue (activity + harm). The methodology page is
 * generated from this so it can never drift from the live model (data-model F1).
 */
export const SIGNAL_CATALOGUE: SignalDefinition[] = [
  ...ACTIVITY_SIGNALS.map((s) => s.def),
  ...HARM_SIGNALS,
];

/** Sum of activity weights; asserted to equal 1 by the contract test. */
export function totalActivityWeight(): number {
  return ACTIVITY_SIGNALS.reduce((acc, s) => acc + s.def.weight, 0);
}

/** Weighted 0..100 score from the activity breakdown entries. */
export function weightedScore(activity: SignalBreakdownEntry[]): number {
  let sum = 0;
  for (const e of activity) sum += e.subScore * e.weight;
  return sum * 100;
}

/**
 * Map to a verdict. Harm is the decisive factor (spec FR-008): with no harm
 * present, a package is at worst "stable, low activity", never "at risk",
 * however quiet it is. Harm present pushes a quiet package to "slowing down" or
 * "at risk".
 */
export function mapVerdict(score: number, harmPresent: boolean): Verdict {
  if (harmPresent) {
    return score < AT_RISK_THRESHOLD ? "at_risk" : "slowing_down";
  }
  return score >= ACTIVE_THRESHOLD
    ? "actively_maintained"
    : "stable_low_activity";
}

/** Confidence from input completeness. No repo means no publishable number. */
export function confidenceOf(i: ScoringInputs): Confidence {
  if (i.repo === null) return "insufficient_data";
  const repo = i.repo;
  const missing =
    repo.medianIssueResponseHours === null ||
    repo.medianPrMergeHours === null ||
    repo.releaseDates.length === 0 ||
    i.latestReleaseAt === null;
  return missing ? "medium" : "high";
}
