/**
 * Define the working universe from the real most-depended-on ranking
 * (ecosyste.ms), scaling past the hand-written seed. Upserts package rows and
 * membership + rank, and saves a reproducible universe snapshot. It does NOT
 * score: the pipeline worker/cron scores the members at its cadence.
 *
 * Usage: tsx scripts/sync-universe.ts <npm|pypi|nuget> [size]
 *        (size defaults to $UNIVERSE_SIZE or 1000)
 */
import type { Ecosystem } from "@observatory/core";
import { fetchMostDependedOn, CRITERIA_VERSION } from "@observatory/ingestion";
import {
  createDb,
  upsertEcosystem,
  upsertPackage,
  setUniverseMembership,
  saveUniverse,
} from "@observatory/db";

const ecosystem = process.argv[2] as Ecosystem;
if (ecosystem !== "npm" && ecosystem !== "pypi" && ecosystem !== "nuget") {
  console.error("Usage: tsx scripts/sync-universe.ts <npm|pypi|nuget> [size]");
  process.exit(2);
}
const size = Number(process.argv[3] ?? process.env.UNIVERSE_SIZE ?? 1000);
const asOf = new Date().toISOString();

const { db, sql } = createDb();
await upsertEcosystem(db, {
  id: ecosystem,
  displayName: ecosystem,
  enabled: true,
});

console.log(`Fetching the top ${size} ${ecosystem} packages from ecosyste.ms...`);
const top = await fetchMostDependedOn(ecosystem, size);
console.log(`Got ${top.length}. Defining universe membership...`);

const members: Array<{ packageId: string; rank: number }> = [];
let rank = 0;
for (const t of top) {
  rank += 1;
  const pkg = await upsertPackage(db, { ecosystemId: ecosystem, name: t.name });
  await setUniverseMembership(db, {
    packageId: pkg.id,
    rank,
    transitiveDependents: t.dependentCount,
  });
  members.push({ packageId: pkg.id, rank });
}

await saveUniverse(db, {
  builtAt: new Date(asOf),
  ingestRunId: `sync-${asOf}`,
  ecosystemId: ecosystem,
  criteriaVersion: CRITERIA_VERSION,
  members,
});

console.log(
  `Defined ${members.length} ${ecosystem} members. The pipeline will score them.`,
);
await sql.end();
