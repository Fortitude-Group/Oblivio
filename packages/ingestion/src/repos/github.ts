import type { RepoActivity } from "@observatory/scoring-engine";
import type { GithubAppCreds } from "../github/auth";
import { getInstallationToken } from "../github/auth";
import type { RepoHostAdapter, RepoFetchResult, RepoRef } from "./types";
import { mineHarm } from "./harm";

/** Count timestamps into `buckets` equal time windows, oldest first. */
export function bucketCounts(datesIso: string[], buckets = 4): number[] {
  const out = new Array<number>(buckets).fill(0);
  const ts = datesIso.map((d) => Date.parse(d)).filter((n) => !Number.isNaN(n));
  if (ts.length === 0) return out;
  const min = Math.min(...ts);
  const max = Math.max(...ts);
  const span = max - min || 1;
  for (const t of ts) {
    const idx = Math.min(buckets - 1, Math.floor(((t - min) / span) * buckets));
    out[idx] = (out[idx] ?? 0) + 1;
  }
  return out;
}

/** Bus factor: contributors accounting for the first 50% of contributions. */
export function busFactorFrom(contributions: number[]): {
  busFactor: number;
  topShare: number;
} {
  const sorted = [...contributions].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (total === 0) return { busFactor: sorted.length, topShare: 0 };
  let cumulative = 0;
  let count = 0;
  for (const c of sorted) {
    cumulative += c;
    count += 1;
    if (cumulative / total >= 0.5) break;
  }
  return { busFactor: count, topShare: (sorted[0] ?? 0) / total };
}

/** Parse a `Link` header's rel="last" page number (a count when per_page=1). */
export function lastPageFromLink(link: string | null): number | null {
  if (!link) return null;
  const m = /[?&]page=(\d+)>;\s*rel="last"/.exec(link);
  return m ? Number(m[1]) : null;
}

export function createGithubAdapter(
  creds: GithubAppCreds,
  fetchFn: typeof fetch = fetch,
): RepoHostAdapter {
  async function gh(token: string, path: string) {
    return fetchFn(`https://api.github.com${path}`, {
      headers: {
        Authorization: "token " + token,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "observatory-ingest",
      },
    });
  }

  return {
    host: "github",
    async fetchActivity(ref: RepoRef, _asOf: string): Promise<RepoFetchResult> {
      const token = await getInstallationToken(creds, fetchFn);
      const base = `/repos/${ref.owner}/${ref.name}`;

      const repoRes = await gh(token, base);
      if (repoRes.status === 404)
        return { activity: null, accessState: "not_found" };
      if (repoRes.status === 403 || repoRes.status === 429)
        return { activity: null, accessState: "rate_limited" };
      if (repoRes.status === 451)
        return { activity: null, accessState: "private" };
      if (!repoRes.ok) return { activity: null, accessState: "error" };
      const repo = (await repoRes.json()) as {
        archived: boolean;
        disabled?: boolean;
        pushed_at: string | null;
        default_branch: string;
        open_issues_count: number;
        description: string | null;
        topics?: string[];
      };

      const [commitsRes, releasesRes, contribRes, prRes, secRes] =
        await Promise.all([
          gh(token, `${base}/commits?per_page=100`),
          gh(token, `${base}/releases?per_page=30`),
          gh(token, `${base}/contributors?per_page=100&anon=0`),
          gh(token, `${base}/pulls?state=open&per_page=1`),
          gh(token, `${base}/issues?state=open&labels=security&per_page=30`),
        ]);

      const commits = commitsRes.ok
        ? ((await commitsRes.json()) as Array<{
            commit?: { author?: { date?: string } };
          }>)
        : [];
      const commitDates = commits
        .map((c) => c.commit?.author?.date)
        .filter((d): d is string => Boolean(d));

      const releases = releasesRes.ok
        ? ((await releasesRes.json()) as Array<{ published_at?: string }>)
        : [];
      const releaseDates = releases
        .map((r) => r.published_at)
        .filter((d): d is string => Boolean(d))
        .sort();

      const contributors = contribRes.ok
        ? ((await contribRes.json()) as Array<{ contributions?: number }>)
        : [];
      const contributions = contributors.map((c) => c.contributions ?? 0);
      const { busFactor, topShare } = busFactorFrom(contributions);

      const openPrs =
        lastPageFromLink(prRes.headers.get("link")) ??
        (prRes.ok ? ((await prRes.json()) as unknown[]).length : 0);

      const securityIssues = secRes.ok
        ? ((await secRes.json()) as Array<{
            comments: number;
            pull_request?: unknown;
          }>)
        : [];
      const harm = mineHarm({
        description: repo.description,
        topics: repo.topics ?? [],
        disabled: repo.disabled ?? false,
        securityIssues,
      });

      const lastCommitAt = commitDates[0] ?? repo.pushed_at ?? null;

      const activity: RepoActivity = {
        lastCommitAt,
        commitActivitySeries: bucketCounts(commitDates),
        releaseDates,
        openIssues: Math.max(0, repo.open_issues_count - openPrs),
        // Latency signals need deeper issue/PR mining; left null (engine treats
        // null as neutral) until that ingestion pass is built.
        medianIssueResponseHours: null,
        issueResponseSeries: [],
        openPrs,
        medianPrMergeHours: null,
        openPrBacklogSeries: [],
        contributorCount: contributors.length,
        busFactor,
        topContributorShare: topShare,
        lastActiveMaintainerAt: lastCommitAt,
        isArchived: repo.archived,
      };
      return { activity, accessState: "ok", harm };
    },
  };
}
