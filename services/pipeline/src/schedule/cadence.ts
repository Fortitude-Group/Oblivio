/**
 * Per-source refresh cadence (FR-012, research item 3). Cheap registry reads are
 * frequent; expensive deep-repo analysis is less frequent. Values are the
 * intervals the scheduler uses for repeatable jobs.
 */
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export const CADENCE = {
  registryMetadata: DAY,
  downloads: WEEK,
  deepRepo: WEEK,
  universeRebuild: WEEK,
} as const;

/** GitHub App installation budget. */
export const GITHUB_HOURLY_LIMIT = 5000;
/** Bounded API calls the GitHub adapter makes per repository refresh. */
export const CALLS_PER_REPO = 6;

/**
 * Does refreshing `universeSize` packages on `refreshIntervalMs` fit inside the
 * hourly API budget (Gate C / SC-004)? Pure and unit-testable: no clock, no I/O.
 */
export function cadenceFits(
  universeSize: number,
  refreshIntervalMs: number = CADENCE.deepRepo,
  callsPerRepo: number = CALLS_PER_REPO,
  hourlyLimit: number = GITHUB_HOURLY_LIMIT,
): { callsPerHour: number; fits: boolean } {
  const refreshesPerHour = HOUR / refreshIntervalMs;
  const callsPerHour = universeSize * callsPerRepo * refreshesPerHour;
  return { callsPerHour, fits: callsPerHour <= hourlyLimit };
}
