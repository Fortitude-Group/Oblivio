import { guard, apiJson, apiError } from "@web/lib/api";
import { getScoredRows } from "@web/lib/data";
import { getLeaderboard } from "@web/lib/leaderboards";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const limited = guard(req);
  if (limited) return limited;

  const { slug } = await params;
  const board = getLeaderboard(slug);
  if (!board) return apiError("not_found", 404);

  const url = new URL(req.url);
  const ecosystem = url.searchParams.get("ecosystem");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  let items = board.select(await getScoredRows());
  if (ecosystem) items = items.filter((r) => r.ecosystem === ecosystem);
  const total = items.length;
  const page = items.slice(offset, offset + limit);

  return apiJson({
    slug,
    title: board.title,
    inclusion_note: board.inclusionNote,
    total,
    limit,
    offset,
    items: page.map((r, i) => ({
      rank: offset + i + 1,
      ecosystem: r.ecosystem,
      name: r.name,
      verdict: r.verdict,
      overall_score: r.score,
      transitive_dependents: r.transitiveDependents,
      downloads_last_month: r.downloads,
    })),
  });
}
