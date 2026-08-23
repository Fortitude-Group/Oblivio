import {
  getPackage,
  getLatestScore,
  getDailyHistory,
  getLatestUniverse,
  schema,
} from "@observatory/db";
import {
  ECOSYSTEMS,
  type Verdict,
  type TrendDirection,
} from "@observatory/core";
import { getDb } from "./db";

export async function getPackageView(ecosystem: string, name: string) {
  const db = getDb();
  const pkg = await getPackage(db, ecosystem, name);
  if (!pkg) return null;
  const [snapshot, daily] = await Promise.all([
    getLatestScore(db, pkg.id),
    getDailyHistory(db, pkg.id),
  ]);
  return { pkg, snapshot, daily };
}

export type PackageView = NonNullable<
  Awaited<ReturnType<typeof getPackageView>>
>;

/**
 * The headline finding over the persisted working universe: what share of the
 * most-depended-on packages show abandonment signals (FR-017). Computed over the
 * latest universe snapshot per ecosystem so the denominator is auditable.
 */
export async function getUniverseHeadline() {
  const db = getDb();
  const universes = (
    await Promise.all(ECOSYSTEMS.map((e) => getLatestUniverse(db, e)))
  ).filter((u): u is NonNullable<typeof u> => u !== null);
  const members = universes.flatMap((u) => u.members);
  if (members.length === 0) return null;

  const snaps = await Promise.all(
    members.map((m) => getLatestScore(db, m.packageId)),
  );
  const counts = {} as Record<Verdict, number>;
  let size = 0;
  for (const s of snaps) {
    if (!s) continue;
    size += 1;
    counts[s.verdict as Verdict] = (counts[s.verdict as Verdict] ?? 0) + 1;
  }
  const abandoned =
    (counts.slowing_down ?? 0) + (counts.at_risk ?? 0) + (counts.archived ?? 0);
  const asOf =
    universes
      .map((u) => u.builtAt)
      .sort()
      .at(-1) ?? null;
  return {
    size,
    abandoned,
    share: size > 0 ? abandoned / size : 0,
    counts,
    asOf,
  };
}

/** All scored packages, newest score first — powers the showcase grid. */
export async function listScoredPackages() {
  const db = getDb();
  const pkgs = await db.select().from(schema.packages);
  const rows = await Promise.all(
    pkgs.map(async (pkg) => ({ pkg, snapshot: await getLatestScore(db, pkg.id) })),
  );
  return rows
    .filter((r) => r.snapshot !== null)
    .sort((a, b) => (b.snapshot!.overallScore ?? -1) - (a.snapshot!.overallScore ?? -1));
}

export interface ScoredRow {
  id: string;
  ecosystem: string;
  name: string;
  verdict: Verdict;
  score: number | null;
  trend: TrendDirection | null;
  busFactor: number | null;
  downloads: number;
  transitiveDependents: number;
}

/** Every scored package, enriched with the fields the leaderboards rank on. */
export async function getScoredRows(): Promise<ScoredRow[]> {
  const db = getDb();
  const pkgs = await db.select().from(schema.packages);
  const rows = await Promise.all(
    pkgs.map(async (pkg): Promise<ScoredRow | null> => {
      const s = await getLatestScore(db, pkg.id);
      if (!s) return null;
      const busFactor =
        s.signalBreakdown.find((x) => x.key === "bus_factor")?.rawValue ?? null;
      return {
        id: pkg.id,
        ecosystem: pkg.ecosystemId,
        name: pkg.name,
        verdict: s.verdict as Verdict,
        score: s.overallScore,
        trend: (s.trendDirection as TrendDirection | null) ?? null,
        busFactor,
        downloads: pkg.downloadCount,
        transitiveDependents: pkg.transitiveDependentsCount,
      };
    }),
  );
  return rows.filter((r): r is ScoredRow => r !== null);
}
