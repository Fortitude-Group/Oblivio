import type { ScoredRow } from "./data";

export interface Leaderboard {
  slug: string;
  title: string;
  blurb: string;
  /** What the list includes and, by implication, excludes (Principle XII). */
  inclusionNote: string;
  /** The metric shown in the ranked column. */
  metric: (r: ScoredRow) => string;
  metricLabel: string;
  select: (rows: ScoredRow[]) => ScoredRow[];
}

const byDependents = (a: ScoredRow, b: ScoredRow) =>
  b.transitiveDependents - a.transitiveDependents || b.downloads - a.downloads;
const byDownloads = (a: ScoredRow, b: ScoredRow) => b.downloads - a.downloads;
const fmt = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export const LEADERBOARDS: Leaderboard[] = [
  {
    slug: "at-risk",
    title: "Depended on, yet at risk",
    blurb:
      "The packages a lot of the ecosystem leans on that are showing real signs of trouble.",
    inclusionNote:
      "Includes packages scored at risk or slowing down, ranked by how many other packages depend on them. Excludes archived packages, which get their own list.",
    metric: (r) => `${fmt(r.transitiveDependents)} dependents`,
    metricLabel: "dependents",
    select: (rows) =>
      rows
        .filter((r) => r.verdict === "at_risk" || r.verdict === "slowing_down")
        .sort(byDependents),
  },
  {
    slug: "single-maintainer",
    title: "One person away from trouble",
    blurb:
      "The xkcd-2347 list, made real. Widely-used packages resting on a single maintainer.",
    inclusionNote:
      "Includes packages with a bus factor of one, ranked by how many packages depend on them. A low bus factor is a risk, not a failing.",
    metric: (r) => `${fmt(r.transitiveDependents)} dependents`,
    metricLabel: "dependents",
    select: (rows) =>
      rows
        .filter((r) => r.verdict !== "insufficient_data" && r.busFactor === 1)
        .sort(byDependents),
  },
  {
    slug: "declining",
    title: "Recently declining",
    blurb: "Packages whose health is trending down. Early warnings, not verdicts.",
    inclusionNote:
      "Includes packages whose latest score is lower than their previous one, ranked by dependents.",
    metric: (r) => `${fmt(r.transitiveDependents)} dependents`,
    metricLabel: "dependents",
    select: (rows) =>
      rows.filter((r) => r.trend === "declining").sort(byDependents),
  },
  {
    slug: "archived-still-used",
    title: "Archived, still everywhere",
    blurb:
      "The maintainers have closed the doors, but the downloads have not stopped.",
    inclusionNote:
      "Includes archived packages, ranked by monthly downloads. These will not get security fixes.",
    metric: (r) => `${fmt(r.downloads)} / mo`,
    metricLabel: "downloads",
    select: (rows) =>
      rows.filter((r) => r.verdict === "archived").sort(byDownloads),
  },
  {
    slug: "healthiest",
    title: "Healthiest heavyweights",
    blurb: "Large, important projects that are doing it right. A list without the doom.",
    inclusionNote:
      "Includes actively-maintained packages, ranked by health score. Proof the ecosystem is not all decay.",
    metric: (r) => `${r.score === null ? "n/a" : Math.round(r.score)} / 100`,
    metricLabel: "score",
    select: (rows) =>
      rows
        .filter((r) => r.verdict === "actively_maintained")
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
  },
];

export function getLeaderboard(slug: string): Leaderboard | undefined {
  return LEADERBOARDS.find((l) => l.slug === slug);
}
