export interface Sparkline {
  line: string;
  area: string;
  points: Array<{ x: number; y: number }>;
}

/**
 * Build SVG line + area paths for a 0..100 score series. Pure and deterministic
 * (no clock, no DOM), so it's unit-testable. y is inverted (100 at the top).
 */
export function sparklinePaths(
  values: number[],
  width: number,
  height: number,
  pad = 8,
): Sparkline {
  const n = values.length;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const pts = values.map((v, i) => ({
    x: pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: pad + (1 - Math.max(0, Math.min(100, v)) / 100) * innerH,
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const first = pts[0]!;
  const last = pts[n - 1]!;
  const area = `${line} L${last.x.toFixed(1)} ${(height - pad).toFixed(1)} L${first.x.toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  return { line, area, points: pts };
}
