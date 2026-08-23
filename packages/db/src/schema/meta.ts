import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { ecosystems } from "./packages";
import { validationLabelEnum } from "./enums";

/** An ordered member of a persisted working-universe snapshot. */
export interface UniverseMember {
  packageId: string;
  rank: number;
}

/**
 * A reproducible snapshot of the ranked "most-depended-on" universe (FR-003).
 * Persisting members makes the headline finding's denominator auditable and
 * stable for trend claims (Principle XII).
 */
export const workingUniverses = pgTable("working_universes", {
  id: uuid("id").primaryKey().defaultRandom(),
  builtAt: timestamp("built_at", { withTimezone: true }).notNull(),
  ingestRunId: text("ingest_run_id").notNull(),
  ecosystemId: text("ecosystem_id")
    .notNull()
    .references(() => ecosystems.id),
  criteriaVersion: text("criteria_version").notNull(),
  members: jsonb("members").$type<UniverseMember[]>().notNull(),
});

/** A named, shareable leaderboard definition (FR-018). */
export const leaderboards = pgTable("leaderboards", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  queryDefinition: jsonb("query_definition")
    .$type<Record<string, unknown>>()
    .notNull(),
  inclusionNote: text("inclusion_note").notNull(),
});

/** Hand-labelled fixture rows for the fairness gate (SC-001, FR-033). */
export const validationLabels = pgTable("validation_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageRef: text("package_ref").notNull(),
  label: validationLabelEnum("label").notNull(),
  rationale: text("rationale").notNull(),
  sourceSnapshotAt: timestamp("source_snapshot_at", { withTimezone: true }),
});
