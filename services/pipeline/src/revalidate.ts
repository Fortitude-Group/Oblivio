import { log } from "./observability";

/**
 * ISR revalidation hook (research item 1, T033): tell the web app to regenerate
 * the pages a score change affects, so on-demand ISR is proportional to what
 * actually changed rather than a full rebuild.
 */
export async function revalidatePaths(paths: string[]): Promise<void> {
  const base = process.env.WEB_BASE_URL ?? "http://localhost:3010";
  const token = process.env.REVALIDATE_TOKEN ?? "dev-revalidate";
  try {
    const res = await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, paths }),
    });
    log("revalidate.sent", { count: paths.length, ok: res.ok });
  } catch (e) {
    log("revalidate.failed", { error: String(e) });
  }
}
