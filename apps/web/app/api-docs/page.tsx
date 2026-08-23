import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public API",
  description:
    "A free, read-only API for the Observatory's maintenance-health data. No account required, attribution requested.",
};

const ENDPOINTS: Array<{ method: string; path: string; blurb: string }> = [
  {
    method: "GET",
    path: "/api/v1/packages/{ecosystem}/{name}",
    blurb: "Current health for one package: verdict, score, and the full signal breakdown.",
  },
  {
    method: "GET",
    path: "/api/v1/packages/{ecosystem}/{name}/history",
    blurb: "Daily-downsampled score history for the trend line.",
  },
  {
    method: "GET",
    path: "/api/v1/lists/{slug}",
    blurb: "A leaderboard, paginated. Supports ?ecosystem, ?limit, ?offset.",
  },
  {
    method: "GET",
    path: "/api/v1/ecosystems/{ecosystem}",
    blurb: "State-of-one-ecosystem: universe size, verdict counts, abandonment share.",
  },
  {
    method: "GET",
    path: "/api/v1/headline",
    blurb: "The headline finding across the whole tracked universe.",
  },
  {
    method: "GET",
    path: "/api/v1/search?q=",
    blurb: "Find packages by name.",
  },
];

export default function ApiDocs() {
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
        <h1 style={{ fontSize: "clamp(30px,5.5vw,52px)" }}>Public API</h1>
        <p style={{ margin: "16px 0 0" }}>
          A free, read-only API over the same data the site shows. No account, no
          key. Please attribute the Observatory and cache what you can. Fair use
          is 120 requests a minute per IP; go over and you get a 429 with a
          Retry-After. Every response carries an <code>as_of</code> and an{" "}
          <code>attribution</code> field. A breaking change becomes{" "}
          <code>/api/v2</code>.
        </p>
      </section>

      <div className="panel signals" style={{ marginTop: 20 }}>
        {ENDPOINTS.map((e) => (
          <div className="signal" key={e.path} style={{ gridTemplateColumns: "auto 1fr" }}>
            <div className="name" style={{ fontFamily: "ui-monospace, monospace" }}>
              <span style={{ color: "#34d399", fontWeight: 700 }}>{e.method}</span>{" "}
              {e.path}
              <span>{e.blurb}</span>
            </div>
            <div />
          </div>
        ))}
      </div>

      <p className="methodology-note">
        Insufficient-data packages return a null score and a reason, never a
        fabricated number.
      </p>
    </main>
  );
}
