import type { RepoActivity } from "@observatory/scoring-engine";
import type { RepoHostAdapter, RepoFetchResult, RepoRef } from "./types";
import { bucketCounts, busFactorFrom } from "./github";

/**
 * Minimal GitLab adapter for public projects (no auth required; an optional
 * `GITLAB_TOKEN` raises the rate limit). Less exercised than the GitHub adapter
 * since few top packages are GitLab-hosted; parity is intentional so the pipeline
 * treats hosts uniformly.
 */
export function createGitlabAdapter(
  token: string | undefined = process.env.GITLAB_TOKEN,
  fetchFn: typeof fetch = fetch,
): RepoHostAdapter {
  const headers: Record<string, string> = {
    "User-Agent": "observatory-ingest",
  };
  if (token) headers["PRIVATE-TOKEN"] = token;
  const api = (path: string) =>
    fetchFn(`https://gitlab.com/api/v4${path}`, { headers });

  return {
    host: "gitlab",
    async fetchActivity(ref: RepoRef, _asOf: string): Promise<RepoFetchResult> {
      const encoded = encodeURIComponent(`${ref.owner}/${ref.name}`);
      const projRes = await api(`/projects/${encoded}`);
      if (projRes.status === 404)
        return { activity: null, accessState: "not_found" };
      if (projRes.status === 401 || projRes.status === 403)
        return { activity: null, accessState: "private" };
      if (projRes.status === 429)
        return { activity: null, accessState: "rate_limited" };
      if (!projRes.ok) return { activity: null, accessState: "error" };
      const proj = (await projRes.json()) as { id: number; archived: boolean };

      const [commitsRes, releasesRes, contribRes, mrRes] = await Promise.all([
        api(`/projects/${proj.id}/repository/commits?per_page=100`),
        api(`/projects/${proj.id}/releases?per_page=30`),
        api(`/projects/${proj.id}/repository/contributors`),
        api(`/projects/${proj.id}/merge_requests?state=opened&per_page=1`),
      ]);

      const commitDates = commitsRes.ok
        ? ((await commitsRes.json()) as Array<{ committed_date?: string }>)
            .map((c) => c.committed_date)
            .filter((d): d is string => Boolean(d))
        : [];
      const releaseDates = releasesRes.ok
        ? ((await releasesRes.json()) as Array<{ released_at?: string }>)
            .map((r) => r.released_at)
            .filter((d): d is string => Boolean(d))
            .sort()
        : [];
      const contributions = contribRes.ok
        ? ((await contribRes.json()) as Array<{ commits?: number }>).map(
            (c) => c.commits ?? 0,
          )
        : [];
      const { busFactor, topShare } = busFactorFrom(contributions);
      const openPrs = Number(mrRes.headers.get("x-total") ?? 0);
      const lastCommitAt = commitDates[0] ?? null;

      const activity: RepoActivity = {
        lastCommitAt,
        commitActivitySeries: bucketCounts(commitDates),
        releaseDates,
        openIssues: 0,
        medianIssueResponseHours: null,
        issueResponseSeries: [],
        openPrs,
        medianPrMergeHours: null,
        openPrBacklogSeries: [],
        contributorCount: contributions.length,
        busFactor,
        topContributorShare: topShare,
        lastActiveMaintainerAt: lastCommitAt,
        isArchived: proj.archived,
      };
      return { activity, accessState: "ok" };
    },
  };
}
