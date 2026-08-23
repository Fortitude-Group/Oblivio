import { z } from "zod";

/**
 * Boundary validation (Principle: validate at system boundaries). The key
 * invariant enforced here is spec FR-007/032: a non-numeric verdict
 * (`insufficient_data` / `archived`) MUST carry a null score, never a fabricated
 * number, and `insufficient_data` MUST carry `insufficient_data` confidence.
 */

const NON_NUMERIC = new Set(["insufficient_data", "archived"]);

export const signalEntrySchema = z.object({
  key: z.string().min(1),
  rawValue: z.number().nullable(),
  subScore: z.number(),
  weight: z.number(),
  kind: z.enum(["activity", "harm"]),
  sourceRef: z.string(),
});

export const snapshotInputSchema = z
  .object({
    packageId: z.string().uuid(),
    computedAt: z.date(),
    ingestRunId: z.string().min(1),
    verdict: z.enum([
      "actively_maintained",
      "stable_low_activity",
      "slowing_down",
      "at_risk",
      "archived",
      "insufficient_data",
    ]),
    overallScore: z.number().min(0).max(100).nullable(),
    confidence: z.enum(["high", "medium", "insufficient_data"]),
    signalBreakdown: z.array(signalEntrySchema),
    trendDirection: z
      .enum(["improving", "stable", "declining"])
      .nullable()
      .optional(),
  })
  .refine(
    (v) => !NON_NUMERIC.has(v.verdict) || v.overallScore === null,
    "A non-numeric verdict (insufficient_data/archived) must have a null overallScore",
  )
  .refine(
    (v) =>
      v.verdict !== "insufficient_data" || v.confidence === "insufficient_data",
    "insufficient_data verdict must carry insufficient_data confidence",
  );

export type SnapshotInput = z.infer<typeof snapshotInputSchema>;

export const packageUpsertSchema = z.object({
  ecosystemId: z.string().min(1),
  name: z.string().min(1),
  declaredRepoUrl: z.string().url().nullable().optional(),
  resolvedRepoId: z.string().uuid().nullable().optional(),
  declaredLicense: z.string().nullable().optional(),
  latestVersion: z.string().nullable().optional(),
  latestReleaseAt: z.date().nullable().optional(),
  downloadCount: z.number().int().min(0).optional(),
  directDependentsCount: z.number().int().min(0).optional(),
  transitiveDependentsCount: z.number().int().min(0).optional(),
  isDeprecated: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type PackageUpsert = z.infer<typeof packageUpsertSchema>;
