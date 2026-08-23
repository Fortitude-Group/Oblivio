/**
 * Score the N stalest in-universe packages and exit. This is the batch the
 * scheduled refresh (Azure DevOps pipeline / cron) runs: it replaces the
 * always-on worker, so no Redis and no long-running process is needed. Run it on
 * a schedule and the whole universe cycles on the cadence.
 *
 * Usage: tsx scripts/score-batch.ts [batch-size]   (default $BATCH_SIZE or 100)
 */
import type { Ecosystem } from "@observatory/core";
import { createDb, listStalePackages } from "@observatory/db";
import { refreshPackage, revalidatePaths } from "@observatory/pipeline";

const limit = Number(process.argv[2] ?? process.env.BATCH_SIZE ?? 100);
const { db, sql } = createDb();

const stale = await listStalePackages(db, limit);
console.log(`Scoring ${stale.length} stale packages...`);

for (const p of stale) {
  try {
    const out = await refreshPackage(db, p.ecosystemId as Ecosystem, p.name);
    if (out) {
      await revalidatePaths([
        `/${p.ecosystemId}/${p.name}`,
        `/${p.ecosystemId}`,
        "/",
      ]);
    }
  } catch (e) {
    console.error(`failed ${p.ecosystemId}/${p.name}: ${String(e)}`);
  }
}

console.log("batch complete");
await sql.end();
