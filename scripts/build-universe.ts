/**
 * Build a working universe for an ecosystem, score every member, and persist a
 * reproducible universe snapshot. Powers the front-page headline finding.
 *
 * Usage: tsx scripts/build-universe.ts [npm|pypi]
 */
import type { Ecosystem } from "@observatory/core";
import type { RepoActivity, HarmSignals } from "@observatory/scoring-engine";
import {
  buildUniverse,
  CRITERIA_VERSION,
  resolveRepoUrl,
  credsFromEnv,
  createGithubAdapter,
  createGitlabAdapter,
  buildScoringInputs,
} from "@observatory/ingestion";
import {
  createDb,
  upsertEcosystem,
  upsertPackage,
  insertRepository,
  setUniverseMembership,
  saveUniverse,
} from "@observatory/db";
import { scoreAndPersist } from "@observatory/pipeline";

const SEED: Record<Ecosystem, string[]> = {
  npm: [
    "express", "lodash", "chalk", "debug", "ms", "react", "react-dom",
    "axios", "commander", "semver", "glob", "minimatch", "chokidar",
    "webpack", "eslint", "prettier", "jest", "typescript", "rxjs", "moment",
    "uuid", "yargs", "inquirer", "cross-spawn", "node-fetch", "tslib",
    "colors", "request", "body-parser", "cookie", "qs", "mime", "ansi-styles",
    "supports-color", "readable-stream", "safe-buffer", "inherits", "minimist",
    "once", "wrappy", "which", "brace-expansion", "balanced-match", "concat-map",
  ],
  pypi: [
    "requests", "urllib3", "certifi", "idna", "charset-normalizer", "flask",
    "click", "jinja2", "werkzeug", "numpy", "pandas", "pydantic", "boto3",
    "setuptools", "six", "python-dateutil", "pyyaml", "packaging",
  ],
};

const ecosystem = ((process.argv[2] as Ecosystem) || "npm") as Ecosystem;
const seed = SEED[ecosystem];
const asOf = new Date().toISOString();
const creds = credsFromEnv();

const { db, sql } = createDb();
await upsertEcosystem(db, {
  id: ecosystem,
  displayName: ecosystem,
  enabled: true,
});

console.log(`Building ${ecosystem} universe from ${seed.length} seed packages...`);
const { members } = await buildUniverse(ecosystem, seed);
console.log(`Resolved ${members.length} members. Scoring...\n`);

const persistedMembers: Array<{ packageId: string; rank: number }> = [];

for (const m of members) {
  const registry = m.registry;
  const ref = resolveRepoUrl(registry.declaredRepoUrl);
  let activity: RepoActivity | null = null;
  let harm: HarmSignals | null = null;
  let repoRow: { id: string } | null = null;

  if (ref?.host === "github" && creds) {
    const res = await createGithubAdapter(creds).fetchActivity(ref, asOf);
    activity = res.activity;
    harm = res.harm ?? null;
  } else if (ref?.host === "gitlab") {
    const res = await createGitlabAdapter().fetchActivity(ref, asOf);
    activity = res.activity;
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
    name: m.name,
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
  await setUniverseMembership(db, {
    packageId: pkg.id,
    rank: m.rank,
    transitiveDependents: m.transitiveDependents,
  });

  const inputs = buildScoringInputs(registry, activity, asOf, harm);
  const { result } = await scoreAndPersist(db, {
    packageId: pkg.id,
    ingestRunId: `universe-${asOf}`,
    computedAt: new Date(asOf),
    inputs,
  });
  persistedMembers.push({ packageId: pkg.id, rank: m.rank });
  console.log(
    `#${String(m.rank).padStart(2)} ${m.name.padEnd(20)} depBy=${String(
      m.transitiveDependents,
    ).padStart(2)}  ${result.verdict}`,
  );
}

await saveUniverse(db, {
  builtAt: new Date(asOf),
  ingestRunId: `universe-${asOf}`,
  ecosystemId: ecosystem,
  criteriaVersion: CRITERIA_VERSION,
  members: persistedMembers,
});

console.log(
  `\nSaved ${ecosystem} universe: ${persistedMembers.length} members (${CRITERIA_VERSION}).`,
);
await sql.end();
