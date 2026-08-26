import type { CSSProperties } from "react";
import { sparklinePaths } from "../lib/chart";
import { fullDate } from "../lib/format";

export interface TrendPoint {
  day: string;
  score: number | null;
}

/**
 * Minimum distinct days before a line is worth drawing. Below this the history is
 * one or two dots, which draws as a flat segment that reads as a bug rather than a
 * trend, so we show an honest "still gathering" note instead. A package is
 * re-scored every couple of days, so this fills in within a week or two.
 */
const MIN_POINTS = 4;

/**
 * Health-over-time chart from the daily-downsampled history (FR-011). It needs a
 * few distinct days to be a real trend; with fewer it shows a short note about
 * history still building rather than a misleading near-flat line.
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
  if (usable.length === 0) return null;

  if (usable.length < MIN_POINTS) {
    const days = usable.length;
    return (
      <section className="section">
        <div className="section-head">
          <h2>Health over time</h2>
        </div>
        <div className="panel trend-pending">
          <p>
            We&rsquo;ve scored this package on {days} day{days === 1 ? "" : "s"}{" "}
            so far. The health-over-time chart shows up once there&rsquo;s a bit
            more history to plot, usually within a week or two of first tracking.
          </p>
        </div>
      </section>
    );
  }

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
