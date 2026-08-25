/**
 * Re-fetch registry facts (downloads, latest version/release, licence, declared
 * repo, deprecation) for every in-universe package and write them back. It does
 * NOT score and does NOT touch membership or the repo link, so it is cheap (no
 * GitHub) and safe to re-run. Use it to repair rows whose facts were wiped.
 *
 * Usage: tsx scripts/restore-facts.ts [concurrency]   (default 12)
 */
import type { Ecosystem } from "@observatory/core";
import { createDb, listInUniverse, updateRegistryFacts } from "@observatory/db";
import { getRegistryAdapter } from "@observatory/ingestion";

const concurrency = Number(process.argv[2] ?? 12);
const { db, sql } = createDb();

const pkgs = await listInUniverse(db);
console.log(
  `Refreshing registry facts for ${pkgs.length} in-universe packages (concurrency ${concurrency})...`,
);

let done = 0;
let ok = 0;
let miss = 0;
let failed = 0;

async function one(p: { ecosystemId: string; name: string }) {
  try {
    const reg = await getRegistryAdapter(p.ecosystemId as Ecosystem).fetchPackage(
      p.name,
    );
    if (!reg) {
      miss += 1;
    } else {
      await updateRegistryFacts(db, {
        ecosystemId: p.ecosystemId,
        name: p.name,
        declaredRepoUrl: reg.declaredRepoUrl,
        declaredLicense: reg.declaredLicense,
        latestVersion: reg.latestVersion,
        latestReleaseAt: reg.latestReleaseAt
          ? new Date(reg.latestReleaseAt)
          : null,
        downloadCount: reg.downloadCount,
        isDeprecated: reg.isDeprecated,
      });
      ok += 1;
    }
  } catch {
    failed += 1;
  } finally {
    done += 1;
    if (done % 100 === 0) {
      console.log(`  ${done}/${pkgs.length} (ok ${ok}, miss ${miss}, failed ${failed})`);
    }
  }
}

// Fixed-size worker pool over the shared index.
let idx = 0;
async function worker() {
  while (idx < pkgs.length) {
    await one(pkgs[idx++]);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(`Done. ok ${ok}, miss ${miss}, failed ${failed} of ${pkgs.length}`);
await sql.end();
