import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type {
  ScoringInputs,
  RepoActivity,
  HarmSignals,
} from "@observatory/scoring-engine";
import {
  createDb,
  DEFAULT_DEV_URL,
  upsertEcosystem,
  upsertPackage,
  getLatestScore,
  getDailyHistory,
} from "@observatory/db";
import { scoreAndPersist, computeTrend } from "../src/score";

const ASOF = "2026-08-22T00:00:00Z";
const NO_HARM: HarmSignals = {
  unansweredSecurityIssues: 0,
  dependentBreakageReports: 0,
  neglectedOpenPrs: 0,
  semverStagnationWithOpenBugs: false,
  lookingForMaintainer: false,
};

function healthyRepo(o: Partial<RepoActivity> = {}): RepoActivity {
  return {
    lastCommitAt: "2026-08-10T00:00:00Z",
    commitActivitySeries: [10, 12, 9, 11],
    releaseDates: [
      "2026-02-01T00:00:00Z",
      "2026-04-01T00:00:00Z",
      "2026-06-01T00:00:00Z",
      "2026-08-01T00:00:00Z",
    ],
    openIssues: 5,
    medianIssueResponseHours: 24,
    issueResponseSeries: [30, 28, 20, 18],
    openPrs: 3,
    medianPrMergeHours: 48,
    openPrBacklogSeries: [3, 3, 2, 3],
    contributorCount: 20,
    busFactor: 5,
    topContributorShare: 0.3,
    lastActiveMaintainerAt: "2026-08-12T00:00:00Z",
    isArchived: false,
    ...o,
  };
}

function inputs(o: Partial<ScoringInputs> = {}): ScoringInputs {
  return {
    asOf: ASOF,
    latestReleaseAt: "2026-08-01T00:00:00Z",
    isDeprecated: false,
    downloadCount: 1_000_000,
    repo: healthyRepo(),
    harm: NO_HARM,
    ...o,
  };
}

describe("computeTrend (pure)", () => {
  it("reports improving / declining / stable with an epsilon band", () => {
    expect(computeTrend(50, 60)).toBe("improving");
    expect(computeTrend(60, 50)).toBe("declining");
    expect(computeTrend(50, 51)).toBe("stable");
  });
  it("is stable when either side is unknown (no fabricated move)", () => {
    expect(computeTrend(null, 80)).toBe("stable");
    expect(computeTrend(80, null)).toBe("stable");
  });
});

const url = process.env.DATABASE_URL ?? DEFAULT_DEV_URL;
const HAS_DB = process.env.RUN_DB_TESTS === "1" || !!process.env.DATABASE_URL;

describe.skipIf(!HAS_DB)("scoreAndPersist (engine → DB spine)", () => {
  const { db, sql } = createDb(url);

  beforeAll(async () => {
    await sql`truncate table score_snapshots, score_daily, dependency_edges, working_universes, packages, repositories, validation_labels, leaderboards restart identity cascade`;
    await upsertEcosystem(db, { id: "npm", displayName: "npm", enabled: true });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("scores healthy inputs, appends a snapshot, and rolls up the day", async () => {
    const pkg = await upsertPackage(db, { ecosystemId: "npm", name: "healthy" });
    const { result, snapshot, trendDirection } = await scoreAndPersist(db, {
      packageId: pkg.id,
      ingestRunId: "run-1",
      computedAt: new Date("2026-08-22T00:00:00Z"),
      inputs: inputs(),
    });

    expect(result.verdict).toBe("actively_maintained");
    expect(result.overallScore).toBeGreaterThan(65);
    expect(trendDirection).toBe("stable"); // no prior snapshot

    const latest = await getLatestScore(db, pkg.id);
    expect(latest?.id).toBe(snapshot.id);

    const daily = await getDailyHistory(db, pkg.id);
    expect(daily).toHaveLength(1);
    expect(daily[0]?.day).toBe("2026-08-22");
  });

  it("derives a declining trend from the previous snapshot", async () => {
    const pkg = await upsertPackage(db, { ecosystemId: "npm", name: "sliding" });
    await scoreAndPersist(db, {
      packageId: pkg.id,
      ingestRunId: "run-1",
      computedAt: new Date("2026-08-01T00:00:00Z"),
      inputs: inputs(),
    });
    const second = await scoreAndPersist(db, {
      packageId: pkg.id,
      ingestRunId: "run-2",
      computedAt: new Date("2026-08-20T00:00:00Z"),
      inputs: inputs({
        latestReleaseAt: "2021-01-01T00:00:00Z",
        repo: healthyRepo({
          commitActivitySeries: [0, 0, 0, 0],
          medianIssueResponseHours: 2000,
          medianPrMergeHours: 5000,
          busFactor: 1,
          topContributorShare: 1,
          lastActiveMaintainerAt: "2021-02-01T00:00:00Z",
        }),
        harm: { ...NO_HARM, unansweredSecurityIssues: 2, lookingForMaintainer: true },
      }),
    });
    expect(second.result.verdict).toBe("at_risk");
    expect(second.trendDirection).toBe("declining");
  });

  it("persists insufficient_data with a null score and a stable trend", async () => {
    const pkg = await upsertPackage(db, { ecosystemId: "npm", name: "no-repo" });
    const { result, trendDirection } = await scoreAndPersist(db, {
      packageId: pkg.id,
      ingestRunId: "run-1",
      computedAt: new Date("2026-08-22T00:00:00Z"),
      inputs: inputs({ repo: null }),
    });
    expect(result.verdict).toBe("insufficient_data");
    expect(result.overallScore).toBeNull();
    expect(trendDirection).toBe("stable");

    const daily = await getDailyHistory(db, pkg.id);
    expect(daily[0]?.overallScore).toBeNull();
  });
});
