import { loadConfig } from "@observatory/config";
import type { Verdict } from "@observatory/core";
import { guard, apiJson, apiError } from "@web/lib/api";
import { getPackageView } from "@web/lib/data";

export const runtime = "nodejs";

function registryUrl(ecosystem: string, name: string): string {
  if (ecosystem === "npm") return `https://www.npmjs.com/package/${name}`;
  if (ecosystem === "nuget") return `https://www.nuget.org/packages/${name}`;
  return `https://pypi.org/project/${name}/`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ecosystem: string; package: string }> },
) {
  const limited = guard(req);
  if (limited) return limited;

  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const view = await getPackageView(ecosystem, name);
  if (!view) return apiError("not_found", 404);

  const { pkg, snapshot } = view;
  const cfg = loadConfig();
  const verdict = (snapshot?.verdict ?? "insufficient_data") as Verdict;
  const busFactor =
    snapshot?.signalBreakdown.find((s) => s.key === "bus_factor")?.rawValue ??
    null;

  return apiJson({
    ecosystem,
    name,
    verdict,
    overall_score: snapshot?.overallScore ?? null,
    confidence: snapshot?.confidence ?? "insufficient_data",
    trend_direction: snapshot?.trendDirection ?? null,
    ...(verdict === "insufficient_data"
      ? { insufficient_data_reason: "source repository could not be resolved" }
      : {}),
    facts: {
      latest_version: pkg.latestVersion,
      latest_release_at: pkg.latestReleaseAt,
      bus_factor: busFactor,
      downloads_last_month: pkg.downloadCount,
      license: pkg.declaredLicense,
      transitive_dependents: pkg.transitiveDependentsCount,
    },
    signals: (snapshot?.signalBreakdown ?? []).map((s) => ({
      key: s.key,
      raw_value: s.rawValue,
      sub_score: s.subScore,
      weight: s.weight,
      kind: s.kind,
      source_ref: s.sourceRef,
    })),
    repo_url: pkg.declaredRepoUrl,
    registry_url: registryUrl(ecosystem, name),
    methodology_url: `${cfg.baseUrl}/methodology`,
    as_of: snapshot?.computedAt ?? null,
  });
}
