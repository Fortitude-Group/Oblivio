import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Verdict } from "@observatory/core";
import { loadConfig } from "@observatory/config";
import { VERDICT_STYLE } from "../../../lib/verdict";
import { getScoredRows } from "../../../lib/data";
import { getLeaderboard, LEADERBOARDS } from "../../../lib/leaderboards";

export const revalidate = 3600;

export function generateStaticParams() {
  return LEADERBOARDS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const board = getLeaderboard(slug);
  if (!board) return { title: "List not found" };
  const cfg = loadConfig();
  const url = `${cfg.baseUrl}/lists/${slug}`;
  return {
    title: board.title,
    description: board.blurb,
    alternates: { canonical: url },
    openGraph: {
      title: board.title,
      description: board.blurb,
      url,
      siteName: "The Observatory",
      images: [`${cfg.baseUrl}/og/list/${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title: board.title,
      description: board.blurb,
      images: [`${cfg.baseUrl}/og/list/${slug}`],
    },
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = getLeaderboard(slug);
  if (!board) notFound();

  const rows = board.select(await getScoredRows());

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
        <a className="updated" href="/lists">
          all lists →
        </a>
      </header>

      <section className="home-hero" style={{ textAlign: "left" }}>
        <h1 style={{ fontSize: "clamp(30px,5.5vw,52px)" }}>{board.title}</h1>
        <p style={{ margin: "16px 0 0" }}>{board.blurb}</p>
      </section>

      <p className="inclusion">{board.inclusionNote}</p>

      <div className="panel lb">
        {rows.length === 0 ? (
          <p className="lb-empty">
            Nothing on this list right now. That is good news, and it will change
            as the universe grows.
          </p>
        ) : (
          rows.map((r, i) => {
            const style = VERDICT_STYLE[r.verdict as Verdict];
            return (
              <a
                className="lb-row"
                key={r.id}
                href={`/${r.ecosystem}/${encodeURIComponent(r.name)}`}
                style={{ "--accent": style.accent } as CSSProperties}
              >
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">
                  {r.name}
                  <span className="lb-eco">{r.ecosystem}</span>
                </span>
                <span className="lb-verdict" style={{ color: style.accent }}>
                  <span className="led" style={{ background: style.accent }} />
                  {style.label}
                </span>
                <span className="lb-metric">{board.metric(r)}</span>
              </a>
            );
          })
        )}
      </div>

      <p className="methodology-note">
        Ranked from public, reproducible data. Every package links to its full,
        decomposed score.
      </p>
    </main>
  );
}
