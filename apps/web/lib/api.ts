export const ATTRIBUTION =
  "Data: The Observatory (Fortitude Omnis). https://observatory.fortitude-omnis.group";

const CORS = { "access-control-allow-origin": "*" };

/** JSON envelope with attribution and cache headers (spec FR-024, SC-008). */
export function apiJson(
  data: Record<string, unknown>,
  init: { status?: number; cacheSeconds?: number } = {},
): Response {
  const cache = init.cacheSeconds ?? 300;
  return new Response(JSON.stringify({ ...data, attribution: ATTRIBUTION }), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${cache}, s-maxage=${cache}, stale-while-revalidate=86400`,
      ...CORS,
    },
  });
}

export function apiError(code: string, status: number): Response {
  return apiJson({ error: code }, { status, cacheSeconds: 60 });
}

// In-memory fixed-window limiter. Fine for a single instance; a multi-instance
// deployment moves this to Redis (research item 6) without changing callers.
const WINDOW_MS = 60_000;
const LIMIT = 120;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request): { ok: boolean; retryAfter: number } {
  const ip =
    (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]?.trim() ??
    "local";
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > LIMIT) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function tooMany(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after: retryAfter, attribution: ATTRIBUTION }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(retryAfter),
        ...CORS,
      },
    },
  );
}

/** Rate-limit guard: returns a 429 Response to short-circuit, or null to proceed. */
export function guard(req: Request): Response | null {
  const rl = rateLimit(req);
  return rl.ok ? null : tooMany(rl.retryAfter);
}
