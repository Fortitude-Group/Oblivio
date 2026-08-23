import {
  getPackage,
  getLatestScore,
  getDailyHistory,
  schema,
} from "@observatory/db";
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
