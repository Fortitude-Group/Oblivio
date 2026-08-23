/**
 * Shared domain types for The Observatory.
 *
 * The verdict set is the fixed, documented vocabulary every surface uses
 * (spec FR-010). `archived` and `insufficient_data` are hard states set by
 * override, never by the weighted rubric.
 */

export const VERDICTS = [
  "actively_maintained",
  "stable_low_activity",
  "slowing_down",
  "at_risk",
  "archived",
  "insufficient_data",
] as const;

export type Verdict = (typeof VERDICTS)[number];

/** Confidence in a score. `insufficient_data` means no numeric score exists. */
export type Confidence = "high" | "medium" | "insufficient_data";

/** Direction of a package's health over time (set from history, not the rubric). */
export type TrendDirection = "improving" | "stable" | "declining";

/** Ecosystems covered in the initial build (spec: npm + PyPI first). */
export const ECOSYSTEMS = ["npm", "pypi"] as const;

export type Ecosystem = (typeof ECOSYSTEMS)[number];

/** A verdict that carries no numeric score. */
export const NON_NUMERIC_VERDICTS: ReadonlySet<Verdict> = new Set<Verdict>([
  "archived",
  "insufficient_data",
]);
