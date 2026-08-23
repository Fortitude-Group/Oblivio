import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

export interface GithubAppCreds {
  appId: string;
  installationId: string;
  privateKey: string;
}

/**
 * Read GitHub App credentials from the environment. The private key is taken
 * from `GITHUB_APP_PRIVATE_KEY` if inlined, otherwise read from the file at
 * `GITHUB_APP_PRIVATE_KEY_PATH`. The key content is never logged.
 */
export function credsFromEnv(
  env: Record<string, string | undefined> = process.env,
): GithubAppCreds | null {
  const appId = env.GITHUB_APP_ID;
  const installationId = env.GITHUB_APP_INSTALLATION_ID;
  const inline = env.GITHUB_APP_PRIVATE_KEY;
  const base64 = env.GITHUB_APP_PRIVATE_KEY_BASE64;
  const path = env.GITHUB_APP_PRIVATE_KEY_PATH;
  if (!appId || !installationId || (!inline && !base64 && !path)) return null;
  const privateKey = inline
    ? inline
    : base64
      ? Buffer.from(base64, "base64").toString("utf8")
      : readFileSync(path!, "utf8");
  return { appId, installationId, privateKey };
}

function base64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString("base64url");
}

function mintJwt(creds: GithubAppCreds): string {
  const now = Math.floor(Date.now() / 1000);
  const data =
    base64url({ alg: "RS256", typ: "JWT" }) +
    "." +
    base64url({ iat: now - 60, exp: now + 540, iss: String(creds.appId) });
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  signer.end();
  return data + "." + signer.sign(creds.privateKey).toString("base64url");
}

let cache: { token: string; expiresAtMs: number } | null = null;

/** Mint (and cache) an installation access token, refreshing before it expires. */
export async function getInstallationToken(
  creds: GithubAppCreds,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  if (cache && cache.expiresAtMs - 60_000 > Date.now()) return cache.token;
  const res = await fetchFn(
    `https://api.github.com/app/installations/${creds.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + mintJwt(creds),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "observatory-ingest",
      },
    },
  );
  if (!res.ok) throw new Error(`installation token mint failed: ${res.status}`);
  const body = (await res.json()) as { token: string; expires_at: string };
  cache = { token: body.token, expiresAtMs: Date.parse(body.expires_at) };
  return body.token;
}

/** Test seam: reset the cached token. */
export function resetTokenCache(): void {
  cache = null;
}
