import { eq, desc, sql } from "drizzle-orm";
import type { SignalBreakdownEntry } from "@observatory/scoring-engine";
import type { Database } from "../client";
import { scoreSnapshots, scoreDaily } from "../schema";
import { snapshotInputSchema, type SnapshotInput } from "../validation";

/**
 * Append a score snapshot. History is append-only (FR-011); a database trigger
 * additionally blocks UPDATE/DELETE. Input is validated so a non-numeric verdict
 * can never carry a fabricated score (FR-007/032).
 */
export async function insertSnapshot(db: Database, input: SnapshotInput) {
  const v = snapshotInputSchema.parse(input);
  // Guarantee the monthly partition for this snapshot exists (idempotent).
  const day = v.computedAt.toISOString().slice(0, 10);
  await db.execute(sql`select ensure_month_partition(${day}::date)`);
  const [out] = await db
    .insert(scoreSnapshots)
    .values({
      packageId: v.packageId,
      computedAt: v.computedAt,
      ingestRunId: v.ingestRunId,
      verdict: v.verdict,
      overallScore: v.overallScore,
      confidence: v.confidence,
      signalBreakdown: v.signalBreakdown,
      trendDirection: v.trendDirection ?? null,
    })
    .returning();
  return out!;
}

/** The current score = the most recent snapshot for a package. */
export async function getLatestScore(db: Database, packageId: string) {
  const [out] = await db
    .select()
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.packageId, packageId))
    .orderBy(desc(scoreSnapshots.computedAt))
    .limit(1);
  return out ?? null;
}

export interface LatestScore {
  packageId: string;
  verdict: string;
  overallScore: number | null;
  trendDirection: string | null;
  signalBreakdown: SignalBreakdownEntry[];
}

/**
 * Latest snapshot per package in a single query. List and overview pages need
 * the current score for every package at once; doing that as one getLatestScore
 * per package is an N+1 that serialises hundreds of round-trips onto a single
 * serverless connection (slow enough to blow the function timeout). DISTINCT ON,
 * backed by the (package_id, computed_at desc) index, returns them in one pass.
 */
export async function listLatestScores(
  db: Database,
): Promise<Map<string, LatestScore>> {
  const rows = (await db.execute(sql`
    select distinct on (package_id)
      package_id       as "packageId",
      verdict,
      overall_score    as "overallScore",
      trend_direction  as "trendDirection",
      signal_breakdown as "signalBreakdown"
    from score_snapshots
    order by package_id, computed_at desc
  `)) as unknown as LatestScore[];
  const map = new Map<string, LatestScore>();
  for (const r of rows) map.set(r.packageId, r);
  return map;
}

/** Daily-downsampled history for charts (FR-011). */
export async function getDailyHistory(db: Database, packageId: string) {
  return db
    .select()
    .from(scoreDaily)
    .where(eq(scoreDaily.packageId, packageId))
    .orderBy(scoreDaily.day);
}

export async function upsertDaily(
  db: Database,
  row: {
    packageId: string;
    day: string; // YYYY-MM-DD
    overallScore: number | null;
    verdict: (typeof scoreSnapshots.verdict.enumValues)[number];
  },
) {
  await db
    .insert(scoreDaily)
    .values(row)
    .onConflictDoUpdate({
      target: [scoreDaily.packageId, scoreDaily.day],
      set: { overallScore: row.overallScore, verdict: row.verdict },
    });
}

/** Count snapshots for a package (used by tests and observability). */
export async function countSnapshots(
  db: Database,
  packageId: string,
): Promise<number> {
  const [out] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.packageId, packageId));
  return out?.n ?? 0;
}
