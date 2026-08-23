/**
 * Ingest and score a single real package end to end, and persist it.
 *
 * Usage: tsx scripts/ingest-one.ts <npm|pypi> <package-name>
 *
 * Reads registry metadata, resolves the source repo, fetches live repo activity
 * (GitHub via the App credentials in the environment; GitLab public), scores it
 * with the shared engine, and writes a snapshot + daily rollup to the database.
 */
import {
  getRegistryAdapter,
  resolveRepoUrl,
  credsFromEnv,
  createGithubAdapter,
  createGitlabAdapter,
  buildScoringInputs,
} from "@observatory/ingestion";
import type { RepoActivity, HarmSignals } from "@observatory/scoring-engine";
import {
  createDb,
  upsertEcosystem,
  upsertPackage,
  insertRepository,
  getLatestScore,
} from "@observatory/db";
import { scoreAndPersist } from "@observatory/pipeline";
import type { Ecosystem } from "@observatory/core";

const [, , ecoArg, name] = process.argv;
if ((ecoArg !== "npm" && ecoArg !== "pypi") || !name) {
  console.error("Usage: tsx scripts/ingest-one.ts <npm|pypi> <package-name>");
  process.exit(2);
}
const ecosystem = ecoArg as Ecosystem;
const asOf = new Date().toISOString();

const registry = await getRegistryAdapter(ecosystem).fetchPackage(name);
if (!registry) {
  console.error(`Package not found: ${ecosystem}/${name}`);
  process.exit(1);
}

const ref = resolveRepoUrl(registry.declaredRepoUrl);
let activity: RepoActivity | null = null;
let harm: HarmSignals | null = null;
let repoRow: { id: string } | null = null;

const { db, sql } = createDb();
await upsertEcosystem(db, { id: ecosystem, displayName: ecosystem, enabled: true });

if (ref?.host === "github") {
  const creds = credsFromEnv();
  if (creds) {
    const res = await createGithubAdapter(creds).fetchActivity(ref, asOf);
    activity = res.activity;
    harm = res.harm ?? null;
    console.log(`repo: github/${ref.owner}/${ref.name} access=${res.accessState}`);
  } else {
    console.log("repo: github (no App credentials in env → registry-only score)");
  }
} else if (ref?.host === "gitlab") {
  const res = await createGitlabAdapter().fetchActivity(ref, asOf);
  activity = res.activity;
  console.log(`repo: gitlab/${ref.owner}/${ref.name} access=${res.accessState}`);
} else {
  console.log("repo: unresolved → insufficient_data expected");
}

if (ref) {
  repoRow = await insertRepository(db, {
    host: ref.host,
    owner: ref.owner,
    name: ref.name,
    isArchived: activity?.isArchived ?? false,
  });
}

const pkg = await upsertPackage(db, {
  ecosystemId: ecosystem,
  name,
  declaredRepoUrl: registry.declaredRepoUrl,
  resolvedRepoId: repoRow?.id ?? null,
  declaredLicense: registry.declaredLicense,
  latestVersion: registry.latestVersion,
  latestReleaseAt: registry.latestReleaseAt
    ? new Date(registry.latestReleaseAt)
    : null,
  downloadCount: registry.downloadCount,
  isDeprecated: registry.isDeprecated,
});

const inputs = buildScoringInputs(registry, activity, asOf, harm);
if (harm) {
  console.log(
    `harm: security=${harm.unansweredSecurityIssues} lookingForMaintainer=${harm.lookingForMaintainer}`,
  );
}
const { result } = await scoreAndPersist(db, {
  packageId: pkg.id,
  ingestRunId: `manual-${asOf}`,
  computedAt: new Date(asOf),
  inputs,
});

console.log("\n=== SCORE ===");
console.log(`${ecosystem}/${name}`);
console.log(`verdict:     ${result.verdict}`);
console.log(
  `score:       ${result.overallScore === null ? "n/a" : result.overallScore.toFixed(1)} / 100`,
);
console.log(`confidence:  ${result.confidence}`);
console.log(`downloads:   ${registry.downloadCount.toLocaleString()} (last month)`);
console.log("top signals (by contribution):");
[...result.signals]
  .filter((s) => s.kind === "activity")
  .sort((a, b) => b.subScore * b.weight - a.subScore * a.weight)
  .slice(0, 4)
  .forEach((s) =>
    console.log(
      `  - ${s.key.padEnd(24)} sub=${s.subScore.toFixed(2)} weight=${s.weight} raw=${s.rawValue ?? "n/a"}`,
    ),
  );

const persisted = await getLatestScore(db, pkg.id);
console.log(`\npersisted snapshot id: ${persisted?.id} verdict=${persisted?.verdict}`);
await sql.end();
