import type { ScoringInputs, SignalDefinition } from "../types";
import { clamp, daysBetween, decayingScore, mean, halves } from "../util";

export interface SignalSample {
  rawValue: number | null;
  subScore: number;
}

export interface ActivitySignal {
  def: SignalDefinition;
  compute: (i: ScoringInputs) => SignalSample;
}

const GH = "repository activity (commits, releases, issues, PRs)";

/** Days since the latest release. Fresher is healthier. */
export function timeSinceRelease(i: ScoringInputs): SignalSample {
  if (i.latestReleaseAt === null) return { rawValue: null, subScore: 0.3 };
  const days = daysBetween(i.asOf, i.latestReleaseAt);
  return { rawValue: days, subScore: decayingScore(days, 90, 1095) };
}

/** Are releases speeding up or slowing down? Ratio of recent gap to older gap. */
export function releaseCadenceTrend(i: ScoringInputs): SignalSample {
  const rd = i.repo?.releaseDates ?? [];
  if (rd.length < 3) return { rawValue: null, subScore: 0.5 };
  const gaps: number[] = [];
  for (let k = 1; k < rd.length; k++) {
    gaps.push(daysBetween(rd[k]!, rd[k - 1]!));
  }
  const { older, newer } = halves(gaps);
  const oldGap = mean(older) || 1;
  const newGap = mean(newer) || oldGap;
  const ratio = newGap / oldGap;
  return { rawValue: ratio, subScore: decayingScore(ratio, 1.0, 4.0) };
}

/** Recent commit level and its direction. */
export function commitActivityTrend(i: ScoringInputs): SignalSample {
  const s = i.repo?.commitActivitySeries ?? [];
  if (s.length === 0) return { rawValue: null, subScore: 0 };
  const { older, newer } = halves(s);
  const recent = mean(newer);
  const past = mean(older);
  const levelScore = clamp(recent / 20, 0, 1);
  const trendScore =
    past === 0 ? (recent > 0 ? 1 : 0) : clamp(recent / past, 0, 2) / 2;
  return {
    rawValue: recent,
    subScore: clamp(0.6 * levelScore + 0.4 * trendScore, 0, 1),
  };
}

/** Median hours to first response on issues. Faster is healthier. */
export function issueResponseLatency(i: ScoringInputs): SignalSample {
  const h = i.repo?.medianIssueResponseHours ?? null;
  if (h === null) return { rawValue: null, subScore: 0.5 };
  return { rawValue: h, subScore: decayingScore(h, 48, 720) };
}

/** Is issue-response latency improving or worsening? */
export function issueResponseTrend(i: ScoringInputs): SignalSample {
  const s = i.repo?.issueResponseSeries ?? [];
  if (s.length < 2) return { rawValue: null, subScore: 0.5 };
  const { older, newer } = halves(s);
  const oldL = mean(older) || 1;
  const newL = mean(newer);
  const ratio = newL / oldL;
  return { rawValue: ratio, subScore: decayingScore(ratio, 1.0, 3.0) };
}

/** Median hours to merge a PR. Faster is healthier. */
export function prMergeLatency(i: ScoringInputs): SignalSample {
  const h = i.repo?.medianPrMergeHours ?? null;
  if (h === null) return { rawValue: null, subScore: 0.5 };
  return { rawValue: h, subScore: decayingScore(h, 72, 1440) };
}

/** Growth of the open-PR backlog. Shrinking or flat is healthier. */
export function openPrBacklog(i: ScoringInputs): SignalSample {
  const s = i.repo?.openPrBacklogSeries ?? [];
  if (s.length < 2) {
    return { rawValue: i.repo?.openPrs ?? null, subScore: 0.5 };
  }
  const { older, newer } = halves(s);
  const growth = mean(newer) - mean(older);
  return { rawValue: growth, subScore: decayingScore(growth, 0, 20) };
}

/** Contributor concentration. A higher bus factor is healthier. */
export function busFactor(i: ScoringInputs): SignalSample {
  const bf = i.repo?.busFactor ?? 0;
  const share = i.repo?.topContributorShare ?? 1;
  const bfScore =
    bf <= 1
      ? 0.15
      : bf === 2
        ? 0.45
        : bf === 3
          ? 0.7
          : clamp(0.7 + (bf - 3) * 0.15, 0, 1);
  const shareScore = 1 - clamp(share, 0, 1);
  return {
    rawValue: bf,
    subScore: clamp(0.7 * bfScore + 0.3 * shareScore, 0, 1),
  };
}

/** Has a formerly-active maintainer gone quiet? Recent activity is healthier. */
export function maintainerDeparture(i: ScoringInputs): SignalSample {
  const la = i.repo?.lastActiveMaintainerAt ?? null;
  if (la === null) return { rawValue: null, subScore: 0.4 };
  const days = daysBetween(i.asOf, la);
  return { rawValue: days, subScore: decayingScore(days, 120, 730) };
}

function def(
  key: string,
  displayName: string,
  description: string,
  weight: number,
  direction: SignalDefinition["direction"],
): SignalDefinition {
  return { key, displayName, description, weight, kind: "activity", direction };
}

/**
 * The nine weighted activity signals. Weights sum to 1. This array is the
 * code-canonical catalogue the methodology page is generated from (data-model F1).
 */
export const ACTIVITY_SIGNALS: ActivitySignal[] = [
  {
    def: def(
      "time_since_release",
      "Time since last release",
      "Days since the most recent published release. " + GH,
      0.12,
      "higher_riskier",
    ),
    compute: timeSinceRelease,
  },
  {
    def: def(
      "release_cadence_trend",
      "Release cadence trend",
      "Whether releases are speeding up or slowing down.",
      0.08,
      "higher_riskier",
    ),
    compute: releaseCadenceTrend,
  },
  {
    def: def(
      "commit_activity_trend",
      "Commit activity trend",
      "Recent commit volume and its direction.",
      0.1,
      "higher_healthier",
    ),
    compute: commitActivityTrend,
  },
  {
    def: def(
      "issue_response_latency",
      "Issue response latency",
      "Median time to first maintainer response on issues.",
      0.12,
      "higher_riskier",
    ),
    compute: issueResponseLatency,
  },
  {
    def: def(
      "issue_response_trend",
      "Issue response trend",
      "Whether issue-response latency is improving or worsening.",
      0.06,
      "higher_riskier",
    ),
    compute: issueResponseTrend,
  },
  {
    def: def(
      "pr_merge_latency",
      "PR merge latency",
      "Median time to merge a pull request.",
      0.12,
      "higher_riskier",
    ),
    compute: prMergeLatency,
  },
  {
    def: def(
      "open_pr_backlog",
      "Open PR backlog growth",
      "Whether the backlog of open pull requests is growing.",
      0.1,
      "higher_riskier",
    ),
    compute: openPrBacklog,
  },
  {
    def: def(
      "bus_factor",
      "Bus factor",
      "Contributor concentration; how many people the project depends on.",
      0.16,
      "higher_healthier",
    ),
    compute: busFactor,
  },
  {
    def: def(
      "maintainer_departure",
      "Maintainer departure",
      "Whether a formerly-active maintainer has gone quiet.",
      0.14,
      "higher_riskier",
    ),
    compute: maintainerDeparture,
  },
];
