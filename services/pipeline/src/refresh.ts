import type { Ecosystem } from "@observatory/core";
import type { RepoActivity, HarmSignals } from "@observatory/scoring-engine";
import {
  getRegistryAdapter,
  resolveRepoUrl,
  credsFromEnv,
  createGithubAdapter,
  createGitlabAdapter,
  buildScoringInputs,
  type GithubAppCreds,
} from "@observatory/ingestion";
import {
  upsertPackage,
  insertRepository,
  type Database,
} from "@observatory/db";
import { scoreAndPersist } from "./score";
import { log } from "./observability";

let cachedCreds: GithubAppCreds | null | undefined;
function creds(): GithubAppCreds | null {
  if (cachedCreds === undefined) cachedCreds = credsFromEnv() ?? null;
  return cachedCreds;
}

/**
 * The `ingest-registry` + `refresh-repo` + `score` + `rollup` sequence for one
 * package (FR-002/012): fetch registry metadata, resolve and fetch the repo,
 * mine harm, score, and persist. Reuses the shared engine and the append-only
 * store; the only writes to a repo host are read requests (Principle: read-only).
 */
export async function refreshPackage(
  db: Database,
  ecosystem: Ecosystem,
  name: string,
  asOf: string = new Date().toISOString(),
) {
  const registry = await getRegistryAdapter(ecosystem).fetchPackage(name);
  if (!registry) {
    log("ingest.miss", { ecosystem, name });
    return null;
  }

  const ref = resolveRepoUrl(registry.declaredRepoUrl);
  let activity: RepoActivity | null = null;
  let harm: HarmSignals | null = null;
  let accessState = "unresolved";
  let repoId: string | null = null;

  if (ref?.host === "github") {
    const c = creds();
    if (c) {
      const res = await createGithubAdapter(c).fetchActivity(ref, asOf);
      activity = res.activity;
      harm = res.harm ?? null;
      accessState = res.accessState;
    } else {
      accessState = "no_credentials";
    }
  } else if (ref?.host === "gitlab") {
    const res = await createGitlabAdapter().fetchActivity(ref, asOf);
    activity = res.activity;
    accessState = res.accessState;
  }

  if (ref) {
    const repo = await insertRepository(db, {
      host: ref.host,
      owner: ref.owner,
      name: ref.name,
      isArchived: activity?.isArchived ?? false,
    });
    repoId = repo.id;
  }

  const pkg = await upsertPackage(db, {
    ecosystemId: ecosystem,
    name,
    declaredRepoUrl: registry.declaredRepoUrl,
    resolvedRepoId: repoId,
    declaredLicense: registry.declaredLicense,
    latestVersion: registry.latestVersion,
    latestReleaseAt: registry.latestReleaseAt
      ? new Date(registry.latestReleaseAt)
      : null,
    downloadCount: registry.downloadCount,
    isDeprecated: registry.isDeprecated,
  });

  const inputs = buildScoringInputs(registry, activity, asOf, harm);
  const { result } = await scoreAndPersist(db, {
    packageId: pkg.id,
    ingestRunId: `refresh-${asOf}`,
    computedAt: new Date(asOf),
    inputs,
  });

  log("score.persisted", {
    ecosystem,
    name,
    verdict: result.verdict,
    score: result.overallScore,
    access_state: accessState,
  });
  return { registry, ref, activity, harm, pkg, result, accessState };
}
