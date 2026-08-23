import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  jsonb,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { SignalBreakdownEntry } from "@observatory/scoring-engine";
import { verdictEnum, confidenceEnum, trendEnum } from "./enums";
import { packages } from "./packages";

/**
 * Append-only score history: one row per package per scoring run, retained
 * indefinitely (FR-011). A database trigger (migration 0001) forbids UPDATE and
 * DELETE, enforcing the append-only guarantee (Principle X deletion guard).
 * Physical month-partitioning is deferred until volume warrants it (Principle V).
 */
export const scoreSnapshots = pgTable(
  "score_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
    ingestRunId: text("ingest_run_id").notNull(),
    verdict: verdictEnum("verdict").notNull(),
    overallScore: doublePrecision("overall_score"), // null for archived / insufficient_data
    confidence: confidenceEnum("confidence").notNull(),
    signalBreakdown: jsonb("signal_breakdown")
      .$type<SignalBreakdownEntry[]>()
      .notNull(),
    trendDirection: trendEnum("trend_direction"),
  },
  (t) => [
    index("score_snapshots_package_time").on(t.packageId, t.computedAt.desc()),
  ],
);

/**
 * Daily-downsampled score series for charts (FR-011). Rebuilt by the daily
 * rollup job; never a substitute for the append-only history above.
 */
export const scoreDaily = pgTable(
  "score_daily",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id),
    day: date("day").notNull(),
    overallScore: doublePrecision("overall_score"),
    verdict: verdictEnum("verdict").notNull(),
  },
  (t) => [uniqueIndex("score_daily_package_day").on(t.packageId, t.day)],
);
