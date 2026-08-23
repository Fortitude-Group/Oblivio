import { guard, apiJson, apiError } from "@web/lib/api";
import { getEcosystemView } from "@web/lib/data";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ecosystem: string }> },
) {
  const limited = guard(req);
  if (limited) return limited;

  const { ecosystem } = await params;
  const view = await getEcosystemView(ecosystem);
  if (!view) return apiError("not_found", 404);

  return apiJson({
    ecosystem: view.ecosystem,
    universe_size: view.size,
    abandonment_share: view.share,
    verdict_counts: view.counts,
    as_of: view.asOf,
  });
}
