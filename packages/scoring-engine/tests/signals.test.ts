import { describe, it, expect } from "vitest";
import type { ScoringInputs, RepoActivity } from "../src/types";
import {
  timeSinceRelease,
  releaseCadenceTrend,
  commitActivityTrend,
  issueResponseLatency,
  issueResponseTrend,
  prMergeLatency,
  openPrBacklog,
  busFactor,
  maintainerDeparture,
} from "../src/signals/activity";

const ASOF = "2026-08-22T00:00:00Z";

function repo(o: Partial<RepoActivity> = {}): RepoActivity {
  return {
    lastCommitAt: null,
    commitActivitySeries: [],
    releaseDates: [],
    openIssues: 0,
    medianIssueResponseHours: null,
    issueResponseSeries: [],
    openPrs: 0,
    medianPrMergeHours: null,
    openPrBacklogSeries: [],
    contributorCount: 0,
    busFactor: 0,
    topContributorShare: 1,
    lastActiveMaintainerAt: null,
    isArchived: false,
    ...o,
  };
}

function inputs(o: Partial<ScoringInputs> = {}): ScoringInputs {
  return {
    asOf: ASOF,
    latestReleaseAt: null,
    isDeprecated: false,
    downloadCount: 0,
    repo: repo(),
    harm: {
      unansweredSecurityIssues: 0,
      dependentBreakageReports: 0,
      neglectedOpenPrs: 0,
      semverStagnationWithOpenBugs: false,
      lookingForMaintainer: false,
    },
    ...o,
  };
}

describe("per-signal edge/boundary behaviour (U1)", () => {
  it("time_since_release: fresh=1, ancient=0, unknown=neutral-low", () => {
    expect(
      timeSinceRelease(inputs({ latestReleaseAt: "2026-08-20T00:00:00Z" }))
        .subScore,
    ).toBe(1);
    expect(
      timeSinceRelease(inputs({ latestReleaseAt: "2018-01-01T00:00:00Z" }))
        .subScore,
    ).toBe(0);
    expect(timeSinceRelease(inputs()).subScore).toBe(0.3);
  });

  it("release_cadence_trend: too few releases is neutral", () => {
    expect(
      releaseCadenceTrend(
        inputs({ repo: repo({ releaseDates: ["2026-01-01T00:00:00Z"] }) }),
      ).subScore,
    ).toBe(0.5);
  });

  it("commit_activity_trend: empty series scores 0", () => {
    expect(commitActivityTrend(inputs()).subScore).toBe(0);
  });

  it("issue_response_latency: fast=1, slow=0, unknown=neutral", () => {
    expect(
      issueResponseLatency(
        inputs({ repo: repo({ medianIssueResponseHours: 10 }) }),
      ).subScore,
    ).toBe(1);
    expect(
      issueResponseLatency(
        inputs({ repo: repo({ medianIssueResponseHours: 1000 }) }),
      ).subScore,
    ).toBe(0);
    expect(issueResponseLatency(inputs()).subScore).toBe(0.5);
  });

  it("issue_response_trend: needs >=2 points, improving scores high", () => {
    expect(
      issueResponseTrend(inputs({ repo: repo({ issueResponseSeries: [10] }) }))
        .subScore,
    ).toBe(0.5);
    expect(
      issueResponseTrend(
        inputs({ repo: repo({ issueResponseSeries: [100, 100, 20, 20] }) }),
      ).subScore,
    ).toBeGreaterThan(0.5);
  });

  it("pr_merge_latency: fast=1, unknown=neutral", () => {
    expect(
      prMergeLatency(inputs({ repo: repo({ medianPrMergeHours: 24 }) }))
        .subScore,
    ).toBe(1);
    expect(prMergeLatency(inputs()).subScore).toBe(0.5);
  });

  it("open_pr_backlog: shrinking backlog scores high", () => {
    expect(
      openPrBacklog(
        inputs({ repo: repo({ openPrBacklogSeries: [10, 8, 4, 2] }) }),
      ).subScore,
    ).toBe(1);
  });

  it("bus_factor: one maintainer is low, many is high", () => {
    const low = busFactor(
      inputs({ repo: repo({ busFactor: 1, topContributorShare: 1 }) }),
    ).subScore;
    const high = busFactor(
      inputs({ repo: repo({ busFactor: 8, topContributorShare: 0.2 }) }),
    ).subScore;
    expect(low).toBeLessThan(0.3);
    expect(high).toBeGreaterThan(0.8);
  });

  it("maintainer_departure: recent activity high, long gap low, unknown mid-low", () => {
    expect(
      maintainerDeparture(
        inputs({
          repo: repo({ lastActiveMaintainerAt: "2026-08-01T00:00:00Z" }),
        }),
      ).subScore,
    ).toBe(1);
    expect(
      maintainerDeparture(
        inputs({
          repo: repo({ lastActiveMaintainerAt: "2020-01-01T00:00:00Z" }),
        }),
      ).subScore,
    ).toBe(0);
    expect(maintainerDeparture(inputs()).subScore).toBe(0.4);
  });
});
