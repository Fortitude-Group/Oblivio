/** Pure numeric helpers. No clock reads, no I/O. */

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Whole/fractional days from `dateIso` up to `asOfIso` (never negative-clamped). */
export function daysBetween(asOfIso: string, dateIso: string): number {
  const ms = Date.parse(asOfIso) - Date.parse(dateIso);
  return ms / 86_400_000;
}

/**
 * Map a "smaller is healthier" quantity (e.g. days since release, latency hours)
 * to a 0..1 sub-score: 1 at or below `goodBelow`, 0 at or above `zeroAt`,
 * linear between.
 */
export function decayingScore(
  value: number,
  goodBelow: number,
  zeroAt: number,
): number {
  if (value <= goodBelow) return 1;
  if (value >= zeroAt) return 0;
  return clamp(1 - (value - goodBelow) / (zeroAt - goodBelow), 0, 1);
}

/** Mean of a numeric slice; 0 for an empty slice. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

/** Split a series into older and newer halves (newer is the trailing half). */
export function halves(series: number[]): { older: number[]; newer: number[] } {
  const mid = Math.floor(series.length / 2);
  return { older: series.slice(0, mid), newer: series.slice(mid) };
}
