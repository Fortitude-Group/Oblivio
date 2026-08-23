import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SignalBreakdownEntry } from "@observatory/scoring-engine";
import type { Verdict } from "@observatory/core";
import {
  createDb,
  DEFAULT_DEV_URL,
  upsertEcosystem,
  upsertPackage,
  insertRepository,
  insertSnapshot,
  setUniverseMembership,
  saveUniverse,
} from "@observatory/db";
import { GET as pkg } from "../../app/api/v1/packages/[ecosystem]/[package]/route";
import { GET as list } from "../../app/api/v1/lists/[slug]/route";
import { GET as headline } from "../../app/api/v1/headline/route";
import { GET as search } from "../../app/api/v1/search/route";
import { GET as badge } from "../../app/badge/[ecosystem]/[package]/route";

const HAS_DB = process.env.RUN_DB_TESTS === "1" || !!process.env.DATABASE_URL;
const url = process.env.DATABASE_URL ?? DEFAULT_DEV_URL;
const req = (u = "http://localhost/") => new Request(u);
const p = <T,>(o: T) => Promise.resolve(o);

function breakdown(busFactor: number): SignalBreakdownEntry[] {
  return [
    { key: "time_since_release", rawValue: 120, subScore: 0.9, weight: 0.12, kind: "activity", sourceRef: "repo" },
    { key: "bus_factor", rawValue: busFactor, subScore: 0.5, weight: 0.16, kind: "activity", sourceRef: "repo" },
  ];
}

describe.skipIf(!HAS_DB)("public API v1 contract (contracts/public-api.md)", () => {
  const { db, sql } = createDb(url);

  beforeAll(async () => {
    // Hermetic fixture: the DB/pipeline suites truncate, so seed our own.
    await sql`truncate table score_snapshots, score_daily, dependency_edges, working_universes, packages, repositories, validation_labels, leaderboards restart identity cascade`;
    await upsertEcosystem(db, { id: "npm", displayName: "npm", enabled: true });

    async function seed(
      name: string,
      verdict: Verdict,
      busFactor: number,
      rank: number,
      dependents: number,
    ) {
      const repo = await insertRepository(db, {
        host: "github",
        owner: name,
        name,
        isArchived: verdict === "archived",
      });
      const row = await upsertPackage(db, {
        ecosystemId: "npm",
        name,
        resolvedRepoId: repo.id,
        declaredRepoUrl: `https://github.com/${name}/${name}`,
        declaredLicense: "MIT",
        latestVersion: "1.0.0",
        downloadCount: 1_000_000,
      });
      await setUniverseMembership(db, {
        packageId: row.id,
        rank,
        transitiveDependents: dependents,
      });
      await insertSnapshot(db, {
        packageId: row.id,
        computedAt: new Date("2026-08-23T00:00:00Z"),
        ingestRunId: "contract",
        verdict,
        overallScore: verdict === "archived" ? null : 55,
        confidence: verdict === "archived" ? "medium" : "high",
        signalBreakdown: breakdown(busFactor),
      });
      return row.id;
    }

    const ids = [
      await seed("ms", "stable_low_activity", 1, 1, 4),
      await seed("request", "archived", 2, 2, 0),
      await seed("lodash", "stable_low_activity", 3, 3, 0),
    ];
    await saveUniverse(db, {
      builtAt: new Date("2026-08-23T00:00:00Z"),
      ingestRunId: "contract",
      ecosystemId: "npm",
      criteriaVersion: "transitive-dependents-v1",
      members: ids.map((id, i) => ({ packageId: id, rank: i + 1 })),
    });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("package: schema, decomposed signals, attribution, methodology link", async () => {
    const res = await pkg(req(), { params: p({ ecosystem: "npm", package: "lodash" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("lodash");
    expect(body.attribution).toContain("Observatory");
    expect(body.signals.length).toBeGreaterThan(0);
    expect(body.methodology_url).toContain("/methodology");
    expect(body.as_of).toBeTruthy();
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });

  it("package: 404 for an unknown package", async () => {
    const res = await pkg(req(), {
      params: p({ ecosystem: "npm", package: "__definitely-not-real__" }),
    });
    expect(res.status).toBe(404);
  });

  it("headline: share, counts, and by_ecosystem breakdown", async () => {
    const body = await (await headline(req())).json();
    expect(body.universe_size).toBe(3);
    expect(typeof body.at_risk_share).toBe("number");
    expect(Array.isArray(body.by_ecosystem)).toBe(true);
  });

  it("list: inclusion_note, ranked items, single-maintainer picks bus factor 1", async () => {
    const body = await (
      await list(req("http://localhost/?limit=5"), {
        params: p({ slug: "single-maintainer" }),
      })
    ).json();
    expect(body.inclusion_note).toBeTruthy();
    expect(body.items[0].rank).toBe(1);
    expect(body.items[0].name).toBe("ms");
  });

  it("list: 404 for an unknown slug", async () => {
    const res = await list(req(), { params: p({ slug: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("search: matches by name", async () => {
    const body = await (await search(req("http://localhost/?q=req"))).json();
    expect(body.results.some((r: { name: string }) => r.name === "request")).toBe(true);
  });

  it("badge: verdict-coloured SVG for embedding", async () => {
    const res = await badge(req(), { params: p({ ecosystem: "npm", package: "lodash" }) });
    expect(res.headers.get("content-type")).toContain("svg");
    expect(await res.text()).toContain("observatory");
  });

  // MUST be last: exhausts the shared in-memory rate-limit bucket.
  it("rate limit: 429 with Retry-After past the window", async () => {
    let status = 200;
    let retryAfter: string | null = null;
    for (let i = 0; i < 140; i++) {
      const r = await search(req("http://localhost/?q=x"));
      status = r.status;
      if (status === 429) {
        retryAfter = r.headers.get("retry-after");
        break;
      }
    }
    expect(status).toBe(429);
    expect(retryAfter).toBeTruthy();
  });
});
