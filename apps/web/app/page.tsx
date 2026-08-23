import type { CSSProperties } from "react";
import type { Verdict } from "@observatory/core";
import { VERDICT_STYLE } from "../lib/verdict";
import { fullDate } from "../lib/format";
import { listScoredPackages, getUniverseHeadline } from "../lib/data";
import { LEADERBOARDS } from "../lib/leaderboards";

export const revalidate = 3600;

const BREAKDOWN_ORDER: Verdict[] = [
  "actively_maintained",
  "stable_low_activity",
  "slowing_down",
  "at_risk",
  "archived",
  "insufficient_data",
];

export default async function Home() {
  const [headline, rows] = await Promise.all([
    getUniverseHeadline(),
    listScoredPackages(),
  ]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="wordmark">
          <span className="dot" />
          <span>
            Observatory
            <small>maintenance health</small>
          </span>
        </div>
        <div className="updated">
          <span className="pulse" />
          live
        </div>
      </header>

      {headline ? (
        <section className="headline">
          <div className="big">{Math.round(headline.share * 100)}%</div>
          <p className="cap">
            of the {headline.size} most-depended-on packages we track show
            abandonment signals: slowing down, at risk, or archived. As of{" "}
            {fullDate(headline.asOf)}.
          </p>
          <div className="breakdown">
            {BREAKDOWN_ORDER.map((v) => {
              const n = headline.counts[v] ?? 0;
              if (n === 0) return null;
              const style = VERDICT_STYLE[v];
              return (
                <span className="chip" key={v}>
                  <span
                    className="led"
                    style={{ background: style.accent }}
                  />
                  <b>{n}</b> {style.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="home-hero">
          <h1>
            Is that dependency
            <br />
            still maintained?
          </h1>
          <p>
            A free, honest health check for the open-source packages the world
            depends on.
          </p>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Leaderboards</h2>
          <a href="/lists">All lists →</a>
        </div>
        <div className="grid">
          {LEADERBOARDS.map((l) => (
            <a className="card" key={l.slug} href={`/lists/${l.slug}`}>
              <div className="cn" style={{ marginTop: 0 }}>
                {l.title}
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 13.5 }}>
                {l.blurb}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recently scored</h2>
        </div>
        <div className="grid">
          {rows.map(({ pkg, snapshot }) => {
            const verdict = snapshot!.verdict as Verdict;
            const style = VERDICT_STYLE[verdict];
            return (
              <a
                key={pkg.id}
                className="card"
                href={`/${pkg.ecosystemId}/${pkg.name}`}
                style={{ "--accent": style.accent } as CSSProperties}
              >
                <span className="eco">{pkg.ecosystemId}</span>
                <div className="cn">{pkg.name}</div>
                <div className="cv" style={{ color: style.accent }}>
                  <span
                    className="led"
                    style={{ background: style.accent }}
                  />
                  {style.label}
                  {snapshot!.overallScore !== null &&
                    ` · ${Math.round(snapshot!.overallScore)}`}
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
