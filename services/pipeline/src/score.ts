import type { TrendDirection } from "@observatory/core";
import type { ScoringInputs } from "@observatory/scoring-engine";
import { scorePackage } from "@observatory/scoring-engine";
import {
  type Database,
  getLatestScore,
  insertSnapshot,
  upsertDaily,
} from "@observatory/db";

/** Minimum change (on the 0..100 scale) that counts as a real trend move. */
const TREND_EPSILON = 2;

/**
 * Direction of change from the previous score to the current one. Unknown on
 * either side (e.g. insufficient_data) is reported as `stable` rather than a
 * fabricated move.
 */
export function computeTrend(
  previous: number | null,
  current: number | null,
): TrendDirection {
  if (previous === null || current === null) return "stable";
  const delta = current - previous;
  if (delta > TREND_EPSILON) return "improving";
  if (delta < -TREND_EPSILON) return "declining";
  return "stable";
}

/** UTC calendar day (YYYY-MM-DD) of a snapshot, for the daily rollup. */
function isoDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export interface ScoreAndPersistParams {
  packageId: string;
  ingestRunId: string;
  computedAt: Date;
  inputs: ScoringInputs;
}

/**
 * The core score-and-persist step (the heart of the pipeline's `score` +
 * `rollup-daily` jobs, T031): score snapshotted inputs, derive the trend from
 * the previous snapshot, append an immutable history row (FR-011), and update
 * that day's downsampled rollup. Pure orchestration over the shared engine and
 * the append-only store; no live fetches.
 */
export async function scoreAndPersist(
  db: Database,
  params: ScoreAndPersistParams,
) {
  const result = scorePackage(params.inputs);

  const previous = await getLatestScore(db, params.packageId);
  const trendDirection = computeTrend(
    previous?.overallScore ?? null,
    result.overallScore,
  );

  const snapshot = await insertSnapshot(db, {
    packageId: params.packageId,
    computedAt: params.computedAt,
    ingestRunId: params.ingestRunId,
    verdict: result.verdict,
    overallScore: result.overallScore,
    confidence: result.confidence,
    signalBreakdown: result.signals,
    trendDirection,
  });

  await upsertDaily(db, {
    packageId: params.packageId,
    day: isoDay(params.computedAt),
    overallScore: result.overallScore,
    verdict: result.verdict,
  });

  return { result, snapshot, trendDirection };
}
