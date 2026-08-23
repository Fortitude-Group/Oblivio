import type { ScoringInputs, RepoActivity, HarmSignals } from "../src/types";

/**
 * Hand-labelled validation set for the fairness gate (Gate A / SC-001).
 *
 * Three classes: genuinely `abandoned`, `active`, and the critical
 * `finished_healthy` (small perfect utilities and large mature slow-movers that
 * are complete, not rotting). Profiles are representative fixtures, each with a
 * rationale, used to prove the model never brands a finished-but-healthy package
 * as at risk. In production these would be sourced from real, snapshotted repos.
 */

export type Label = "abandoned" | "active" | "finished_healthy";

export interface ValidationCase {
  name: string;
  label: Label;
  rationale: string;
  inputs: ScoringInputs;
}

const ASOF = "2026-08-22T00:00:00Z";

const NO_HARM: HarmSignals = {
  unansweredSecurityIssues: 0,
  dependentBreakageReports: 0,
  neglectedOpenPrs: 0,
  semverStagnationWithOpenBugs: false,
  lookingForMaintainer: false,
};

function repo(overrides: Partial<RepoActivity>): RepoActivity {
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
    ...overrides,
  };
}

function inputs(overrides: Partial<ScoringInputs>): ScoringInputs {
  return {
    asOf: ASOF,
    latestReleaseAt: "2026-08-01T00:00:00Z",
    isDeprecated: false,
    downloadCount: 1_000_000,
    repo: repo({}),
    harm: NO_HARM,
    ...overrides,
  };
}

export const VALIDATION_SET: ValidationCase[] = [
  // --- active ---
  {
    name: "npm/active-web-framework",
    label: "active",
    rationale: "Frequent releases, fast reviews, healthy bus factor.",
    inputs: inputs({}),
  },
  {
    name: "pypi/active-http-client",
    label: "active",
    rationale: "Steady cadence, responsive maintainers, many contributors.",
    inputs: inputs({
      repo: repo({
        medianIssueResponseHours: 12,
        medianPrMergeHours: 36,
        busFactor: 6,
        topContributorShare: 0.25,
      }),
    }),
  },
  // --- finished_healthy ---
  {
    name: "npm/tiny-perfect-util",
    label: "finished_healthy",
    rationale:
      "Small, complete utility. No release in years because it is finished; no dependent-facing harm.",
    inputs: inputs({
      latestReleaseAt: "2021-05-01T00:00:00Z",
      repo: repo({
        lastCommitAt: "2021-05-01T00:00:00Z",
        commitActivitySeries: [0, 0, 0, 0],
        releaseDates: ["2020-01-01T00:00:00Z", "2021-05-01T00:00:00Z"],
        openIssues: 1,
        medianIssueResponseHours: null,
        issueResponseSeries: [],
        openPrs: 0,
        medianPrMergeHours: null,
        openPrBacklogSeries: [],
        contributorCount: 1,
        busFactor: 1,
        topContributorShare: 1,
        lastActiveMaintainerAt: "2021-05-01T00:00:00Z",
      }),
    }),
  },
  {
    name: "pypi/mature-slow-mover",
    label: "finished_healthy",
    rationale:
      "Large mature project, slow but alive, responsive enough, no harm.",
    inputs: inputs({
      latestReleaseAt: "2025-06-01T00:00:00Z",
      repo: repo({
        commitActivitySeries: [2, 1, 2, 1],
        releaseDates: [
          "2023-01-01T00:00:00Z",
          "2024-01-01T00:00:00Z",
          "2025-06-01T00:00:00Z",
        ],
        medianIssueResponseHours: 60,
        issueResponseSeries: [70, 65, 60, 58],
        medianPrMergeHours: 120,
        openPrBacklogSeries: [5, 5, 4, 5],
        busFactor: 4,
        topContributorShare: 0.4,
        lastActiveMaintainerAt: "2025-07-01T00:00:00Z",
      }),
    }),
  },
  {
    name: "npm/complete-cli-tool",
    label: "finished_healthy",
    rationale: "Feature-complete CLI, quiet for a year, zero harm signals.",
    inputs: inputs({
      latestReleaseAt: "2025-08-01T00:00:00Z",
      repo: repo({
        commitActivitySeries: [1, 0, 1, 0],
        releaseDates: ["2024-02-01T00:00:00Z", "2025-08-01T00:00:00Z"],
        medianIssueResponseHours: 90,
        issueResponseSeries: [100, 95, 90, 92],
        medianPrMergeHours: 200,
        openPrBacklogSeries: [2, 2, 2, 2],
        busFactor: 2,
        topContributorShare: 0.6,
        lastActiveMaintainerAt: "2025-09-01T00:00:00Z",
      }),
    }),
  },
  // --- abandoned ---
  {
    name: "npm/abandoned-parser",
    label: "abandoned",
    rationale:
      "No commits in years, unanswered security issues, looking for maintainer, growing PR backlog.",
    inputs: inputs({
      latestReleaseAt: "2021-01-01T00:00:00Z",
      repo: repo({
        lastCommitAt: "2021-02-01T00:00:00Z",
        commitActivitySeries: [0, 0, 0, 0],
        releaseDates: [
          "2019-01-01T00:00:00Z",
          "2020-01-01T00:00:00Z",
          "2021-01-01T00:00:00Z",
        ],
        openIssues: 40,
        medianIssueResponseHours: 2000,
        issueResponseSeries: [500, 900, 1500, 2000],
        openPrs: 15,
        medianPrMergeHours: 5000,
        openPrBacklogSeries: [5, 9, 12, 15],
        contributorCount: 1,
        busFactor: 1,
        topContributorShare: 1,
        lastActiveMaintainerAt: "2021-02-01T00:00:00Z",
      }),
      harm: {
        unansweredSecurityIssues: 2,
        dependentBreakageReports: 3,
        neglectedOpenPrs: 6,
        semverStagnationWithOpenBugs: true,
        lookingForMaintainer: true,
      },
    }),
  },
  {
    name: "pypi/dead-orm-shim",
    label: "abandoned",
    rationale:
      "Sole maintainer departed, open security issue, dependents breaking.",
    inputs: inputs({
      latestReleaseAt: "2022-03-01T00:00:00Z",
      repo: repo({
        lastCommitAt: "2022-04-01T00:00:00Z",
        commitActivitySeries: [1, 0, 0, 0],
        releaseDates: ["2021-01-01T00:00:00Z", "2022-03-01T00:00:00Z"],
        openIssues: 25,
        medianIssueResponseHours: 1500,
        issueResponseSeries: [400, 700, 1100, 1500],
        openPrs: 10,
        medianPrMergeHours: 4000,
        openPrBacklogSeries: [3, 6, 8, 10],
        contributorCount: 1,
        busFactor: 1,
        topContributorShare: 1,
        lastActiveMaintainerAt: "2022-04-01T00:00:00Z",
      }),
      harm: {
        unansweredSecurityIssues: 1,
        dependentBreakageReports: 4,
        neglectedOpenPrs: 4,
        semverStagnationWithOpenBugs: true,
        lookingForMaintainer: false,
      },
    }),
  },
];
