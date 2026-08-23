import type { Metadata } from "next";
import { SIGNAL_CATALOGUE } from "@observatory/scoring-engine";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the Observatory scores maintenance health: every signal, the weights, and the fairness rules that keep finished packages from being branded dead.",
};

export default function Methodology() {
  const activity = SIGNAL_CATALOGUE.filter((s) => s.kind === "activity");
  const harm = SIGNAL_CATALOGUE.filter((s) => s.kind === "harm");

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
        <h1 style={{ fontSize: "clamp(30px,5vw,48px)" }}>Methodology</h1>
        <p style={{ margin: "18px 0 0" }}>
          Every score is a transparent, weighted rubric over public signals. No
          learned black box, no hand-tuning of individual packages. This page is
          generated from the live model, so it can never drift from the numbers
          you see.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>The fairness rule</h2>
        </div>
        <div className="panel signals">
          <p style={{ color: "var(--text-dim)", maxWidth: "70ch" }}>
            A small, complete package that has not changed in three years because
            it is finished is <b>not</b> abandoned. The rubric weights
            dependent-facing harm (unanswered security issues, breakage,
            neglected pull requests) above raw commit silence. With no harm
            signals present, a package is never worse than &ldquo;stable, low
            activity&rdquo;, however quiet it is.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Activity signals</h2>
          <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
            weights sum to 100
          </span>
        </div>
        <div className="panel signals">
          {activity.map((s) => (
            <div className="signal" key={s.key}>
              <div className="name">
                {s.displayName}
                <span>{s.description}</span>
              </div>
              <div className="track">
                <div
                  className="fill"
                  style={{
                    // eslint-disable-next-line
                    ["--w" as string]: s.weight / 0.16,
                    background: "#38bdf8",
                  }}
                />
              </div>
              <div className="meta">
                <b>{(s.weight * 100).toFixed(0)}</b> weight
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Harm signals (verdict overrides)</h2>
        </div>
        <div className="panel signals">
          <p
            style={{
              color: "var(--text-dim)",
              maxWidth: "70ch",
              marginBottom: 12,
            }}
          >
            These carry no numeric weight. Their presence is what moves a package
            toward &ldquo;slowing down&rdquo; or &ldquo;at risk&rdquo;.
          </p>
          {harm.map((s) => (
            <div className="signal" key={s.key}>
              <div className="name">
                {s.displayName}
                <span>{s.description}</span>
              </div>
              <div />
              <div className="meta" style={{ color: "var(--text-faint)" }}>
                override
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
