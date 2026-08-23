import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Verdict } from "@observatory/core";
import { SIGNAL_CATALOGUE } from "@observatory/scoring-engine";
import { loadConfig } from "@observatory/config";
import { VERDICT_STYLE } from "../../../lib/verdict";
import { compact, fullDate, relativeTime } from "../../../lib/format";
import { getPackageView } from "../../../lib/data";

export const revalidate = 3600; // ISR: regenerate on the pipeline's cadence.

type Params = { ecosystem: string; package: string };

function registryUrl(ecosystem: string, name: string): string {
  return ecosystem === "npm"
    ? `https://www.npmjs.com/package/${name}`
    : `https://pypi.org/project/${name}/`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const view = await getPackageView(ecosystem, name);
  if (!view) return { title: "Package not found" };
  const verdict = (view.snapshot?.verdict ?? "insufficient_data") as Verdict;
  const style = VERDICT_STYLE[verdict];
  const cfg = loadConfig();
  const url = `${cfg.baseUrl}/${ecosystem}/${name}`;
  const ogImage = `${cfg.baseUrl}/og/pkg/${ecosystem}/${name}`;
  const title = `Is ${name} maintained?`;
  return {
    title,
    description: style.tagline,
    alternates: { canonical: url },
    openGraph: {
      title: `${name} · ${style.label}`,
      description: style.tagline,
      url,
      siteName: "The Observatory",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · ${style.label}`,
      description: style.tagline,
      images: [ogImage],
    },
  };
}

function fillColour(subScore: number): string {
  if (subScore >= 0.66) return "#34d399";
  if (subScore >= 0.33) return "#fbbf24";
  return "#fb7185";
}

const TREND_GLYPH: Record<string, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

export default async function PackagePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const view = await getPackageView(ecosystem, name);
  if (!view) notFound();

  const { pkg, snapshot } = view;
  const verdict = (snapshot?.verdict ?? "insufficient_data") as Verdict;
  const style = VERDICT_STYLE[verdict];
  const score = snapshot?.overallScore ?? null;
  const cfg = loadConfig();

  const R = 88;
  const C = 2 * Math.PI * R;
  const frac = score === null ? 0 : Math.max(0, Math.min(1, score / 100));
  const offset = C * (1 - frac);

  const breakdown = snapshot?.signalBreakdown ?? [];
  const activity = breakdown
    .filter((s) => s.kind === "activity")
    .sort((a, b) => b.weight - a.weight);
  const harms = breakdown.filter(
    (s) => s.kind === "harm" && (s.rawValue ?? 0) > 0,
  );
  const busFactor =
    breakdown.find((s) => s.key === "bus_factor")?.rawValue ?? null;
  const trend = snapshot?.trendDirection ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name,
    codeRepository: pkg.declaredRepoUrl ?? undefined,
    programmingLanguage: ecosystem === "npm" ? "JavaScript" : "Python",
    description: style.tagline,
    license: pkg.declaredLicense ?? undefined,
  };

  return (
    <main className="shell" style={{ "--accent": style.accent } as CSSProperties}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          Updated {relativeTime(snapshot?.computedAt ?? null)}
        </div>
      </header>

      <section className="panel hero">
        <span className="glow" />
        <div className="ring-wrap">
          <svg viewBox="0 0 200 200">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={style.accent} />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="100" cy="100" r={R} />
            {score !== null && (
              <circle
                className="ring-value"
                cx="100"
                cy="100"
                r={R}
                style={
                  {
                    strokeDasharray: C,
                    strokeDashoffset: offset,
                    "--circ": C,
                  } as CSSProperties
                }
              />
            )}
          </svg>
          <div className="ring-center">
            {score !== null ? (
              <>
                <div className="ring-score">{Math.round(score)}</div>
                <div className="ring-out">/ 100</div>
              </>
            ) : (
              <div className="ring-score na">
                {verdict === "archived" ? "Archived" : "No score"}
              </div>
            )}
            <div className="ring-conf">
              {(snapshot?.confidence ?? "insufficient data").replace(/_/g, " ")}
            </div>
          </div>
        </div>

        <div className="hero-body">
          <span className="eco">{ecosystem}</span>
          <h1 className="pkg-name">{name}</h1>
          <div className="verdict-row">
            <span className="verdict-pill">
              <span className="led" />
              {style.label}
            </span>
            {trend && (
              <span className="trend">
                {TREND_GLYPH[trend]} {trend}
              </span>
            )}
          </div>
          <p className="tagline">{style.tagline}</p>
        </div>
      </section>

      {/* key facts */}
      <section className="section">
        <div className="section-head">
          <h2>Key facts</h2>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="label">Latest release</div>
            <div className="value">{fullDate(pkg.latestReleaseAt)}</div>
            <div className="sub">{relativeTime(pkg.latestReleaseAt)}</div>
          </div>
          <div className="stat">
            <div className="label">Latest version</div>
            <div className="value">{pkg.latestVersion ?? "n/a"}</div>
            <div className="sub">{ecosystem} registry</div>
          </div>
          <div className="stat">
            <div className="label">Downloads</div>
            <div className="value">{compact(pkg.downloadCount)}</div>
            <div className="sub">last month</div>
          </div>
          <div className="stat">
            <div className="label">Bus factor</div>
            <div className="value">{busFactor ?? "n/a"}</div>
            <div className="sub">carry half the work</div>
          </div>
          <div className="stat">
            <div className="label">Licence</div>
            <div className="value">{pkg.declaredLicense ?? "n/a"}</div>
            <div className="sub">declared</div>
          </div>
          <div className="stat">
            <div className="label">Trend</div>
            <div className="value">
              {trend ? `${TREND_GLYPH[trend]} ${trend}` : "n/a"}
            </div>
            <div className="sub">direction of health</div>
          </div>
        </div>
      </section>

      {/* signal breakdown */}
      {verdict !== "insufficient_data" ? (
        <section className="section">
          <div className="section-head">
            <h2>How this score is built</h2>
            <a href="/methodology">Full methodology →</a>
          </div>
          <div className="panel signals">
            {activity.map((s) => {
              const def = SIGNAL_CATALOGUE.find((d) => d.key === s.key);
              const contribution = s.subScore * s.weight * 100;
              return (
                <div className="signal" key={s.key}>
                  <div className="name">
                    {def?.displayName ?? s.key}
                    <span>{def?.description}</span>
                  </div>
                  <div className="track">
                    <div
                      className="fill"
                      style={
                        {
                          "--w": s.subScore,
                          background: fillColour(s.subScore),
                        } as CSSProperties
                      }
                    />
                  </div>
                  <div className="meta">
                    <b>+{contribution.toFixed(1)}</b> / {(s.weight * 100).toFixed(0)}
                  </div>
                </div>
              );
            })}

            {harms.length > 0 ? (
              <div className="harm-flag">
                ⚠ Harm signals present:{" "}
                {harms
                  .map(
                    (h) =>
                      SIGNAL_CATALOGUE.find((d) => d.key === h.key)
                        ?.displayName ?? h.key,
                  )
                  .join(", ")}
                .
              </div>
            ) : (
              <div className="harm-clear">
                ✓ No dependent-facing harm signals. Quiet does not mean
                abandoned.
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="panel signals">
            <p style={{ color: "var(--text-dim)" }}>
              We could not resolve enough public data (a reachable source
              repository) to score {name} fairly, so no number is shown. This is
              never dressed up as a low score.
            </p>
          </div>
        </section>
      )}

      {/* links */}
      <div className="links">
        {pkg.declaredRepoUrl && (
          <a href={pkg.declaredRepoUrl} rel="noreferrer">
            View source repository ↗
          </a>
        )}
        <a href={registryUrl(ecosystem, name)} rel="noreferrer">
          {ecosystem} registry ↗
        </a>
        <a href="/methodology">How we score →</a>
      </div>

      {/* embeddable badge */}
      <section className="section">
        <div className="section-head">
          <h2>Embed the badge</h2>
        </div>
        <div className="panel badge-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/badge/${ecosystem}/${name}`}
            alt={`Observatory: ${style.label}`}
            height={20}
          />
          <code>{`[![Observatory](${cfg.baseUrl}/badge/${ecosystem}/${name})](${cfg.baseUrl}/${ecosystem}/${name})`}</code>
        </div>
      </section>

      {/* honest on-ramp: OSPulse + the related PoisonBox */}
      {(cfg.ospulseOnRamp.enabled || cfg.poisonBox.enabled) && (
        <div className="onramp">
          <p>
            <b>Watching more than one package?</b> The Observatory checks one
            package at a time, free, forever. OSPulse watches your whole
            dependency tree and tells you the moment one starts to slide.
          </p>
          <div className="onramp-actions">
            {cfg.ospulseOnRamp.enabled && (
              <a className="cta" href={cfg.ospulseOnRamp.href} rel="noreferrer">
                Explore OSPulse
              </a>
            )}
            {cfg.poisonBox.enabled && (
              <a
                className="cta secondary"
                href={cfg.poisonBox.href}
                rel="noreferrer"
              >
                Explore PoisonBox
              </a>
            )}
          </div>
        </div>
      )}

      <p className="methodology-note">
        Every number above decomposes into named, sourced signals. If you can
        dispute a score, the answer is data, not opinion.
      </p>
    </main>
  );
}
