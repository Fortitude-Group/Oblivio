import { describe, it, expect } from "vitest";
import { resolveRepoUrl } from "../src/resolve";
import { mapNpm } from "../src/registries/npm";
import { mapPypi, pickRepoUrl } from "../src/registries/pypi";
import {
  bucketCounts,
  busFactorFrom,
  lastPageFromLink,
} from "../src/repos/github";
import { buildScoringInputs } from "../src/assemble";
import {
  isLookingForMaintainer,
  countUnansweredSecurity,
  mineHarm,
} from "../src/repos/harm";

describe("resolveRepoUrl", () => {
  it.each([
    ["git+https://github.com/lodash/lodash.git", "github", "lodash", "lodash"],
    ["https://github.com/pallets/flask", "github", "pallets", "flask"],
    ["github:owner/repo", "github", "owner", "repo"],
    ["git@github.com:owner/repo.git", "github", "owner", "repo"],
    ["https://gitlab.com/group/proj", "gitlab", "group", "proj"],
  ])("parses %s", (url, host, owner, name) => {
    expect(resolveRepoUrl(url)).toEqual({ host, owner, name });
  });

  it("returns null for non-repo or empty input", () => {
    expect(resolveRepoUrl("https://example.com/x")).toBeNull();
    expect(resolveRepoUrl(null)).toBeNull();
    expect(resolveRepoUrl(undefined)).toBeNull();
  });
});

describe("mapNpm", () => {
  it("maps dist-tags, times, repo and license", () => {
    const out = mapNpm(
      "lodash",
      {
        "dist-tags": { latest: "4.17.21" },
        time: {
          created: "2012-04-23T00:00:00Z",
          "4.17.20": "2020-08-13T00:00:00Z",
          "4.17.21": "2021-02-20T00:00:00Z",
        },
        versions: { "4.17.21": { license: "MIT" } },
        repository: { url: "git+https://github.com/lodash/lodash.git" },
        license: "MIT",
      },
      500,
    );
    expect(out.latestVersion).toBe("4.17.21");
    expect(out.latestReleaseAt).toBe("2021-02-20T00:00:00Z");
    expect(out.releaseDates).toHaveLength(2);
    expect(out.declaredRepoUrl).toContain("github.com/lodash/lodash");
    expect(out.declaredLicense).toBe("MIT");
    expect(out.downloadCount).toBe(500);
    expect(out.isDeprecated).toBe(false);
  });

  it("flags deprecation on the latest version", () => {
    const out = mapNpm(
      "old",
      {
        "dist-tags": { latest: "1.0.0" },
        time: { "1.0.0": "2018-01-01T00:00:00Z" },
        versions: { "1.0.0": { deprecated: "use something else" } },
      },
      0,
    );
    expect(out.isDeprecated).toBe(true);
  });
});

describe("mapPypi / pickRepoUrl", () => {
  it("maps version, releases and finds the source URL", () => {
    const out = mapPypi(
      "requests",
      {
        info: {
          version: "2.31.0",
          project_urls: { Source: "https://github.com/psf/requests" },
          license: "Apache 2.0",
        },
        releases: {
          "2.30.0": [{ upload_time_iso_8601: "2023-05-03T00:00:00Z" }],
          "2.31.0": [{ upload_time_iso_8601: "2023-05-22T00:00:00Z" }],
        },
      },
      1000,
    );
    expect(out.latestVersion).toBe("2.31.0");
    expect(out.latestReleaseAt).toBe("2023-05-22T00:00:00Z");
    expect(out.releaseDates).toHaveLength(2);
    expect(out.declaredRepoUrl).toBe("https://github.com/psf/requests");
  });

  it("prefers a github/gitlab project URL over home_page", () => {
    expect(
      pickRepoUrl({
        home_page: "https://requests.example",
        project_urls: { Code: "https://gitlab.com/x/y" },
      }),
    ).toBe("https://gitlab.com/x/y");
  });
});

describe("repo activity helpers", () => {
  it("bucketCounts sums to the input length across 4 buckets", () => {
    const dates = [
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
      "2026-07-01T00:00:00Z",
      "2026-08-01T00:00:00Z",
    ];
    const buckets = bucketCounts(dates);
    expect(buckets).toHaveLength(4);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(4);
    expect(bucketCounts([])).toEqual([0, 0, 0, 0]);
  });

  it("busFactorFrom counts contributors reaching 50% of contributions", () => {
    expect(busFactorFrom([100])).toEqual({ busFactor: 1, topShare: 1 });
    expect(busFactorFrom([50, 50]).busFactor).toBe(1);
    expect(busFactorFrom([40, 30, 30]).busFactor).toBe(2);
  });

  it("lastPageFromLink extracts the count", () => {
    const link =
      '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=42>; rel="last"';
    expect(lastPageFromLink(link)).toBe(42);
    expect(lastPageFromLink(null)).toBeNull();
  });
});

describe("harm mining (conservative)", () => {
  it("detects looking-for-maintainer from description, topics, or disabled", () => {
    expect(
      isLookingForMaintainer(
        "This project is no longer maintained.",
        [],
        false,
      ),
    ).toBe(true);
    expect(isLookingForMaintainer(null, ["unmaintained"], false)).toBe(true);
    expect(isLookingForMaintainer(null, [], true)).toBe(true);
  });

  it("does NOT flag a healthy description (protects fairness)", () => {
    expect(
      isLookingForMaintainer(
        "A modern utility library delivering modularity and performance.",
        ["javascript", "utilities"],
        false,
      ),
    ).toBe(false);
  });

  it("counts only unanswered, non-PR security issues", () => {
    expect(
      countUnansweredSecurity([
        { comments: 0 },
        { comments: 3 },
        { comments: 0, pull_request: {} },
      ]),
    ).toBe(1);
  });

  it("mineHarm leaves the deferred signals zero/false", () => {
    const h = mineHarm({
      description: null,
      topics: [],
      disabled: false,
      securityIssues: [],
    });
    expect(h).toEqual({
      unansweredSecurityIssues: 0,
      dependentBreakageReports: 0,
      neglectedOpenPrs: 0,
      semverStagnationWithOpenBugs: false,
      lookingForMaintainer: false,
    });
  });
});

describe("buildScoringInputs", () => {
  it("combines registry + repo and defaults harm to none", () => {
    const inputs = buildScoringInputs(
      {
        ecosystem: "npm",
        name: "lodash",
        latestVersion: "4.17.21",
        latestReleaseAt: "2021-02-20T00:00:00Z",
        releaseDates: [],
        downloadCount: 500,
        declaredRepoUrl: "https://github.com/lodash/lodash",
        declaredLicense: "MIT",
        isDeprecated: false,
      },
      null,
      "2026-08-23T00:00:00Z",
    );
    expect(inputs.latestReleaseAt).toBe("2021-02-20T00:00:00Z");
    expect(inputs.downloadCount).toBe(500);
    expect(inputs.repo).toBeNull();
    expect(inputs.harm.unansweredSecurityIssues).toBe(0);
  });
});
