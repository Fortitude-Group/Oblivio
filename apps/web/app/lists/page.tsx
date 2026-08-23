import type { Metadata } from "next";
import { LEADERBOARDS } from "../../lib/leaderboards";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "Shareable lists of the open-source packages worth watching: at risk, single-maintainer, archived-but-everywhere, and the healthiest heavyweights.",
};

export default function Lists() {
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
      </header>

      <section className="home-hero" style={{ textAlign: "left" }}>
        <h1 style={{ fontSize: "clamp(30px,5.5vw,52px)" }}>Leaderboards</h1>
        <p style={{ margin: "16px 0 0" }}>
          The packages worth watching, ranked from public data. Each list is its
          own link, built to be shared.
        </p>
      </section>

      <div className="grid" style={{ marginTop: 30 }}>
        {LEADERBOARDS.map((l) => (
          <a className="card" key={l.slug} href={`/lists/${l.slug}`}>
            <div className="cn" style={{ marginTop: 0 }}>
              {l.title}
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 14 }}>{l.blurb}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
