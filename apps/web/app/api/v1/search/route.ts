import { guard, apiJson } from "@web/lib/api";
import { getScoredRows } from "@web/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = guard(req);
  if (limited) return limited;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const ecosystem = url.searchParams.get("ecosystem");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);

  let rows = q ? await getScoredRows() : [];
  rows = rows.filter((r) => r.name.toLowerCase().includes(q));
  if (ecosystem) rows = rows.filter((r) => r.ecosystem === ecosystem);
  rows.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return ap - bp || a.name.localeCompare(b.name);
  });

  return apiJson({
    query: q,
    results: rows.slice(0, limit).map((r) => ({
      ecosystem: r.ecosystem,
      name: r.name,
      verdict: r.verdict,
      overall_score: r.score,
    })),
  });
}
