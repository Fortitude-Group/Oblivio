import { eq, desc } from "drizzle-orm";
import type { Database } from "../client";
import { workingUniverses, type UniverseMember } from "../schema";

/** Persist a reproducible working-universe snapshot (FR-003, Principle XII). */
export async function saveUniverse(
  db: Database,
  row: {
    builtAt: Date;
    ingestRunId: string;
    ecosystemId: string;
    criteriaVersion: string;
    members: UniverseMember[];
  },
) {
  const [out] = await db.insert(workingUniverses).values(row).returning();
  return out!;
}

/** The latest persisted universe for an ecosystem (the headline denominator). */
export async function getLatestUniverse(db: Database, ecosystemId: string) {
  const [out] = await db
    .select()
    .from(workingUniverses)
    .where(eq(workingUniverses.ecosystemId, ecosystemId))
    .orderBy(desc(workingUniverses.builtAt))
    .limit(1);
  return out ?? null;
}
