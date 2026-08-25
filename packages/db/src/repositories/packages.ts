import { eq, and, sql } from "drizzle-orm";
import type { Database } from "../client";
import { ecosystems, packages, repositories } from "../schema";
import { packageUpsertSchema, type PackageUpsert } from "../validation";

export async function upsertEcosystem(
  db: Database,
  row: {
    id: string;
    displayName: string;
    homepageUrl?: string | null;
    enabled?: boolean;
  },
) {
  const [out] = await db
    .insert(ecosystems)
    .values({
      id: row.id,
      displayName: row.displayName,
      homepageUrl: row.homepageUrl ?? null,
      enabled: row.enabled ?? false,
    })
    .onConflictDoUpdate({
      target: ecosystems.id,
      set: {
        displayName: row.displayName,
        homepageUrl: row.homepageUrl ?? null,
        enabled: row.enabled ?? false,
      },
    })
    .returning();
  return out!;
}

/** Upsert a package by (ecosystem, name). Validates input at the boundary. */
export async function upsertPackage(db: Database, input: PackageUpsert) {
  const v = packageUpsertSchema.parse(input);
  const [out] = await db
    .insert(packages)
    .values({
      ecosystemId: v.ecosystemId,
      name: v.name,
      declaredRepoUrl: v.declaredRepoUrl ?? null,
      resolvedRepoId: v.resolvedRepoId ?? null,
      declaredLicense: v.declaredLicense ?? null,
      latestVersion: v.latestVersion ?? null,
      latestReleaseAt: v.latestReleaseAt ?? null,
      downloadCount: v.downloadCount ?? 0,
      directDependentsCount: v.directDependentsCount ?? 0,
      transitiveDependentsCount: v.transitiveDependentsCount ?? 0,
      isDeprecated: v.isDeprecated ?? false,
      isArchived: v.isArchived ?? false,
      lastIngestedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [packages.ecosystemId, packages.name],
      set: {
        declaredRepoUrl: v.declaredRepoUrl ?? null,
        resolvedRepoId: v.resolvedRepoId ?? null,
        declaredLicense: v.declaredLicense ?? null,
        latestVersion: v.latestVersion ?? null,
        latestReleaseAt: v.latestReleaseAt ?? null,
        downloadCount: v.downloadCount ?? 0,
        isDeprecated: v.isDeprecated ?? false,
        isArchived: v.isArchived ?? false,
        lastIngestedAt: new Date(),
        // NOTE: directDependentsCount / transitiveDependentsCount are deliberately
        // NOT set here. They are owned by setUniverseMembership (fed from the
        // universe ranking). Setting them on a facts refresh would reset them to 0.
      },
    })
    .returning();
  return out!;
}

/**
 * Get a package by (ecosystem, name), inserting a bare shell if it doesn't exist.
 * Unlike upsertPackage this NEVER overwrites an existing row, so defining universe
 * membership can't wipe a package's registry facts (downloads, version, licence).
 */
export async function ensurePackageShell(
  db: Database,
  input: { ecosystemId: string; name: string },
) {
  const [inserted] = await db
    .insert(packages)
    .values({ ecosystemId: input.ecosystemId, name: input.name })
    .onConflictDoNothing({ target: [packages.ecosystemId, packages.name] })
    .returning();
  if (inserted) return inserted;
  const existing = await getPackage(db, input.ecosystemId, input.name);
  return existing!;
}

/**
 * Update ONLY the registry-derived facts on an existing package (downloads,
 * latest version/release, licence, declared repo, deprecation). Leaves the repo
 * link, membership, dependent counts and score history untouched. Cheap (no repo
 * host, no scoring) and safe to re-run; used to refresh or repair facts.
 */
export async function updateRegistryFacts(
  db: Database,
  input: {
    ecosystemId: string;
    name: string;
    declaredRepoUrl?: string | null;
    declaredLicense?: string | null;
    latestVersion?: string | null;
    latestReleaseAt?: Date | null;
    downloadCount?: number;
    isDeprecated?: boolean;
  },
) {
  await db
    .update(packages)
    .set({
      declaredRepoUrl: input.declaredRepoUrl ?? null,
      declaredLicense: input.declaredLicense ?? null,
      latestVersion: input.latestVersion ?? null,
      latestReleaseAt: input.latestReleaseAt ?? null,
      downloadCount: input.downloadCount ?? 0,
      isDeprecated: input.isDeprecated ?? false,
      lastIngestedAt: new Date(),
    })
    .where(
      and(
        eq(packages.ecosystemId, input.ecosystemId),
        eq(packages.name, input.name),
      ),
    );
}

/** Mark a package as a member of the current working universe (FR-003). */
export async function setUniverseMembership(
  db: Database,
  input: { packageId: string; rank: number; transitiveDependents: number },
) {
  await db
    .update(packages)
    .set({
      inUniverse: true,
      universeRank: input.rank,
      transitiveDependentsCount: input.transitiveDependents,
    })
    .where(eq(packages.id, input.packageId));
}

/** All packages currently in the working universe, by rank. */
export async function listInUniverse(db: Database) {
  return db
    .select()
    .from(packages)
    .where(eq(packages.inUniverse, true))
    .orderBy(packages.universeRank);
}

/**
 * In-universe packages ordered by how stale their score is (never-scored first,
 * then oldest score). Drives the batch refresh so the whole universe cycles on
 * the cadence without an always-on worker.
 */
export async function listStalePackages(
  db: Database,
  limit: number,
): Promise<Array<{ id: string; ecosystemId: string; name: string }>> {
  const result = await db.execute(sql`
    select p.id, p.ecosystem_id as "ecosystemId", p.name
    from packages p
    where p.in_universe = true
    order by (
      select max(s.computed_at) from score_snapshots s where s.package_id = p.id
    ) asc nulls first
    limit ${limit}
  `);
  return result as unknown as Array<{
    id: string;
    ecosystemId: string;
    name: string;
  }>;
}

export async function getPackage(
  db: Database,
  ecosystemId: string,
  name: string,
) {
  const [out] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.ecosystemId, ecosystemId), eq(packages.name, name)))
    .limit(1);
  return out ?? null;
}

export async function insertRepository(
  db: Database,
  row: {
    host: "github" | "gitlab";
    owner: string;
    name: string;
    isArchived?: boolean;
  },
) {
  const [out] = await db
    .insert(repositories)
    .values({
      host: row.host,
      owner: row.owner,
      name: row.name,
      isArchived: row.isArchived ?? false,
    })
    .onConflictDoUpdate({
      target: [repositories.host, repositories.owner, repositories.name],
      set: { isArchived: row.isArchived ?? false },
    })
    .returning();
  return out!;
}
