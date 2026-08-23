import type { CSSProperties } from "react";
import { sparklinePaths } from "../lib/chart";
import { fullDate } from "../lib/format";

export interface TrendPoint {
  day: string;
  score: number | null;
}

/**
 * Health-over-time chart from the daily-downsampled history (FR-011). Renders
 * only when there are at least two data points; a single snapshot is not a trend.
 */
export function TrendChart({
  points,
  accent,
}: {
  points: TrendPoint[];
  accent: string;
}) {
  const usable = points.filter(
    (p): p is { day: string; score: number } => p.score !== null,
  );
  if (usable.length < 2) return null;

  const W = 640;
  const H = 150;
  const { line, area, points: coords } = sparklinePaths(
    usable.map((p) => p.score),
    W,
    H,
  );
  const last = coords[coords.length - 1]!;
  const first = usable[0]!;
  const latest = usable[usable.length - 1]!;

  return (
    <section className="section">
      <div className="section-head">
        <h2>Health over time</h2>
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
          {fullDate(first.day)} to {fullDate(latest.day)}
        </span>
      </div>
      <div
        className="panel trendchart"
        style={{ "--accent": accent } as CSSProperties}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#trendFill)" />
          <path
            d={line}
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={last.x} cy={last.y} r="4.5" fill={accent} />
        </svg>
      </div>
    </section>
  );
}
