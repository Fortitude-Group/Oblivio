import { eq, desc, sql } from "drizzle-orm";
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
