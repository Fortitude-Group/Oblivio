import { getPackage, getDailyHistory } from "@observatory/db";
import { guard, apiJson, apiError } from "@web/lib/api";
import { getDb } from "@web/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ecosystem: string; package: string }> },
) {
  const limited = guard(req);
  if (limited) return limited;

  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const db = getDb();
  const pkg = await getPackage(db, ecosystem, name);
  if (!pkg) return apiError("not_found", 404);

  const daily = await getDailyHistory(db, pkg.id);
  return apiJson({
    ecosystem,
    name,
    granularity: "daily",
    history: daily.map((d) => ({
      day: d.day,
      overall_score: d.overallScore,
      verdict: d.verdict,
    })),
    as_of: daily.at(-1)?.day ?? null,
  });
}
