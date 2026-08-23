import { ECOSYSTEMS } from "@observatory/core";
import { guard, apiJson } from "@web/lib/api";
import { getUniverseHeadline, getEcosystemView } from "@web/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = guard(req);
  if (limited) return limited;

  const headline = await getUniverseHeadline();
  if (!headline) {
    return apiJson({ universe_size: 0, at_risk_share: 0, by_ecosystem: [], as_of: null });
  }

  const byEcosystem = (
    await Promise.all(ECOSYSTEMS.map((e) => getEcosystemView(e)))
  )
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .map((v) => ({
      ecosystem: v.ecosystem,
      universe_size: v.size,
      abandonment_share: v.share,
    }));

  return apiJson({
    universe_size: headline.size,
    at_risk_share: headline.share,
    abandoned_count: headline.abandoned,
    verdict_counts: headline.counts,
    by_ecosystem: byEcosystem,
    criteria_version: "transitive-dependents-v1",
    as_of: headline.asOf,
  });
}
