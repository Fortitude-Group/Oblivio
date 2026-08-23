import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDb, DEFAULT_DEV_URL } from "../src/client";
import {
  upsertEcosystem,
  upsertPackage,
  getPackage,
  insertRepository,
  insertSnapshot,
  getLatestScore,
  countSnapshots,
  saveUniverse,
  getLatestUniverse,
} from "../src/repositories";
import { snapshotInputSchema } from "../src/validation";
import type { SignalBreakdownEntry } from "@observatory/scoring-engine";

const url = process.env.DATABASE_URL ?? DEFAULT_DEV_URL;
// Only run against a real database. `pnpm test` without one still passes (the
// scoring-engine suite is DB-free); CI and local `pnpm dev:stack` set the URL.
const HAS_DB = process.env.RUN_DB_TESTS === "1" || !!process.env.DATABASE_URL;

const BREAKDOWN: SignalBreakdownEntry[] = [
  {
    key: "time_since_release",
    rawValue: 20,
    subScore: 1,
    weight: 0.12,
    kind: "activity",
    sourceRef: "repo",
  },
];

describe.skipIf(!HAS_DB)("db repositories (integration)", () => {
  const { db, sql } = createDb(url);

  beforeAll(async () => {
    await sql`truncate table score_snapshots, score_daily, dependency_edges, working_universes, packages, repositories, validation_labels, leaderboards restart identity cascade`;
    await upsertEcosystem(db, {
      id: "npm",
      displayName: "npm",
      enabled: true,
    });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("upserts and reads a package by (ecosystem, name)", async () => {
    const repo = await insertRepository(db, {
      host: "github",
      owner: "lodash",
      name: "lodash",
    });
    const pkg = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "lodash",
      resolvedRepoId: repo.id,
      declaredLicense: "MIT",
      transitiveDependentsCount: 138420,
    });
    const found = await getPackage(db, "npm", "lodash");
    expect(found?.id).toBe(pkg.id);
    expect(found?.transitiveDependentsCount).toBe(138420);

    // Upsert is idempotent on the unique key.
    const again = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "lodash",
    });
    expect(again.id).toBe(pkg.id);
  });

  it("appends score snapshots; latest wins and history accumulates", async () => {
    const pkg = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "left-pad",
    });
    await insertSnapshot(db, {
      packageId: pkg.id,
      computedAt: new Date("2026-08-01T00:00:00Z"),
      ingestRunId: "run-1",
      verdict: "stable_low_activity",
      overallScore: 40,
      confidence: "high",
      signalBreakdown: BREAKDOWN,
      trendDirection: "stable",
    });
    await insertSnapshot(db, {
      packageId: pkg.id,
      computedAt: new Date("2026-08-20T00:00:00Z"),
      ingestRunId: "run-2",
      verdict: "slowing_down",
      overallScore: 30,
      confidence: "high",
      signalBreakdown: BREAKDOWN,
      trendDirection: "declining",
    });
    expect(await countSnapshots(db, pkg.id)).toBe(2);
    const latest = await getLatestScore(db, pkg.id);
    expect(latest?.ingestRunId).toBe("run-2");
    expect(latest?.verdict).toBe("slowing_down");
  });

  it("stores insufficient_data with a null score and rejects a fabricated one", async () => {
    const pkg = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "no-repo",
    });
    await insertSnapshot(db, {
      packageId: pkg.id,
      computedAt: new Date("2026-08-20T00:00:00Z"),
      ingestRunId: "run-1",
      verdict: "insufficient_data",
      overallScore: null,
      confidence: "insufficient_data",
      signalBreakdown: [],
    });
    const latest = await getLatestScore(db, pkg.id);
    expect(latest?.overallScore).toBeNull();

    // The boundary schema forbids a number on a non-numeric verdict (FR-007/032).
    const bad = snapshotInputSchema.safeParse({
      packageId: pkg.id,
      computedAt: new Date(),
      ingestRunId: "x",
      verdict: "insufficient_data",
      overallScore: 10,
      confidence: "insufficient_data",
      signalBreakdown: [],
    });
    expect(bad.success).toBe(false);
  });

  it("enforces append-only history: DELETE is blocked by a trigger", async () => {
    const pkg = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "immutable",
    });
    await insertSnapshot(db, {
      packageId: pkg.id,
      computedAt: new Date("2026-08-20T00:00:00Z"),
      ingestRunId: "run-1",
      verdict: "actively_maintained",
      overallScore: 90,
      confidence: "high",
      signalBreakdown: BREAKDOWN,
    });
    await expect(
      sql`delete from score_snapshots where package_id = ${pkg.id}`,
    ).rejects.toThrow();
  });

  it("attributes one repository to several packages (monorepo)", async () => {
    const repo = await insertRepository(db, {
      host: "github",
      owner: "babel",
      name: "babel",
    });
    const a = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "@babel/core",
      resolvedRepoId: repo.id,
    });
    const b = await upsertPackage(db, {
      ecosystemId: "npm",
      name: "@babel/types",
      resolvedRepoId: repo.id,
    });
    expect(a.resolvedRepoId).toBe(repo.id);
    expect(b.resolvedRepoId).toBe(repo.id);
  });

  it("persists and reads back a working-universe snapshot", async () => {
    const pkg = await upsertPackage(db, { ecosystemId: "npm", name: "react" });
    await saveUniverse(db, {
      builtAt: new Date("2026-08-22T00:00:00Z"),
      ingestRunId: "run-1",
      ecosystemId: "npm",
      criteriaVersion: "transitive-dependents-v1",
      members: [{ packageId: pkg.id, rank: 1 }],
    });
    const latest = await getLatestUniverse(db, "npm");
    expect(latest?.members[0]?.packageId).toBe(pkg.id);
    expect(latest?.criteriaVersion).toBe("transitive-dependents-v1");
  });
});
