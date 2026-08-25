import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ECOSYSTEMS, type Ecosystem, type Verdict } from "@observatory/core";
import { loadConfig } from "@observatory/config";
import { VERDICT_STYLE } from "../../lib/verdict";
import { fullDate } from "../../lib/format";
import { getEcosystemView } from "../../lib/data";

export const revalidate = 3600;

export function generateStaticParams() {
  return ECOSYSTEMS.map((ecosystem) => ({ ecosystem }));
}

const BREAKDOWN_ORDER: Verdict[] = [
  "actively_maintained",
  "stable_low_activity",
  "slowing_down",
  "at_risk",
  "archived",
  "insufficient_data",
];

function isEcosystem(x: string): x is Ecosystem {
  return (ECOSYSTEMS as readonly string[]).includes(x);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ecosystem: string }>;
}): Promise<Metadata> {
  const { ecosystem } = await params;
  if (!isEcosystem(ecosystem)) return { title: "Ecosystem not found" };
  const cfg = loadConfig();
  const title = `${ecosystem} maintenance health`;
  const description = `The state of ${ecosystem}: how the most-depended-on ${ecosystem} packages are holding up.`;
  return {
    title,
    description,
    alternates: { canonical: `${cfg.baseUrl}/${ecosystem}` },
    openGraph: { title, description, siteName: "The Observatory" },
  };
}

export default async function EcosystemPage({
  params,
}: {
  params: Promise<{ ecosystem: string }>;
}) {
  const { ecosystem } = await params;
  if (!isEcosystem(ecosystem)) notFound();
  const view = await getEcosystemView(ecosystem);
  if (!view) notFound();

  return (
    <main className="shell">
      <header className="topbar">
        <a href="/" className="wordmark">
          <span className="dot" />
          <span>
            Observatory
            <small>maintenance health</small>
          </span>
        </a>
        <div className="updated">
          <span className="pulse" />
          as of {fullDate(view.asOf)}
        </div>
      </header>

      <section className="headline">
        <div className="big">{Math.round(view.share * 100)}%</div>
        <p className="cap">
          of the {view.size} most-depended-on <b>{ecosystem}</b> packages we
          track show abandonment signals.
        </p>
        <div className="breakdown">
          {BREAKDOWN_ORDER.map((v) => {
            const n = view.counts[v] ?? 0;
            if (n === 0) return null;
            const style = VERDICT_STYLE[v];
            return (
              <span className="chip" key={v}>
                <span className="led" style={{ background: style.accent }} />
                <b>{n}</b> {style.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Most depended on</h2>
          <a href="/">← all ecosystems</a>
        </div>
        <div className="grid">
          {view.rows.map((r) => {
            const style = VERDICT_STYLE[r.verdict as Verdict];
            return (
              <a
                key={r.id}
                className="card"
                href={`/${r.ecosystem}/${encodeURIComponent(r.name)}`}
                style={{ "--accent": style.accent } as CSSProperties}
              >
                <span className="eco">{r.ecosystem}</span>
                <div className="cn">{r.name}</div>
                <div className="cv" style={{ color: style.accent }}>
                  <span className="led" style={{ background: style.accent }} />
                  {style.label}
                  {r.score !== null && ` · ${Math.round(r.score)}`}
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
