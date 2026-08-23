import type { CSSProperties } from "react";
import type { Verdict } from "@observatory/core";
import { VERDICT_STYLE } from "../lib/verdict";
import { listScoredPackages } from "../lib/data";

export const revalidate = 3600;

export default async function Home() {
  const rows = await listScoredPackages();

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

      <section className="home-hero">
        <h1>
          Is that dependency
          <br />
          still maintained?
        </h1>
        <p>
          A free, honest health check for the open-source packages the world
          depends on. Fair, sourced, and reproducible, so quiet does not get
          mistaken for abandoned.
        </p>
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
