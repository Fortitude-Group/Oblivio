export interface RepoRef {
  host: "github" | "gitlab";
  owner: string;
  name: string;
}

/**
 * Resolve a declared repository URL to a host/owner/name. Handles the forms
 * registries actually emit: https, git+https, git://, ssh, git@host:owner/repo,
 * the npm `github:owner/repo` shorthand, and trailing `.git`.
 */
export function resolveRepoUrl(url: string | null | undefined): RepoRef | null {
  if (!url) return null;
  let u = url.trim();

  const short = /^(github|gitlab):([^/\s]+)\/([^/\s]+)$/.exec(u);
  if (short) {
    return {
      host: short[1] as RepoRef["host"],
      owner: short[2]!,
      name: strip(short[3]!),
    };
  }

  u = u
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\//, "https://")
    .replace(/^git@([^:]+):/, "https://$1/");

  const m = /(github|gitlab)\.com[/:]([^/\s]+)\/([^/\s#?]+)/.exec(u);
  if (!m) return null;
  return { host: m[1] as RepoRef["host"], owner: m[2]!, name: strip(m[3]!) };
}

function strip(name: string): string {
  return name.replace(/\.git$/, "");
}
