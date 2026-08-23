import { ImageResponse } from "next/og";
import { getScoredRows } from "../../../../lib/data";
import { getLeaderboard } from "../../../../lib/leaderboards";
import { VERDICT_STYLE } from "../../../../lib/verdict";
import type { Verdict } from "@observatory/core";

export const runtime = "nodejs";

const BG = "#06070b";
const DIM = "#a3a9b8";
const FAINT = "#646b7e";
const ACCENT = "#7c5cff";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const board = getLeaderboard(slug);
  const title = board?.title ?? "Leaderboard";
  const top = board ? board.select(await getScoredRows()).slice(0, 5) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          backgroundImage: `radial-gradient(60% 60% at 100% 0%, ${ACCENT}33, transparent 60%)`,
          padding: "70px 80px",
          color: "#eceef4",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            letterSpacing: 5,
            color: FAINT,
          }}
        >
          <div
            style={{ width: 18, height: 18, borderRadius: 9, background: ACCENT }}
          />
          THE OBSERVATORY
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700 }}>
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 10 }}>
            {top.map((r, i) => {
              const style = VERDICT_STYLE[r.verdict as Verdict];
              return (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}
                >
                  <div style={{ display: "flex", color: FAINT, width: 40 }}>
                    {i + 1}
                  </div>
                  <div style={{ display: "flex", fontWeight: 600 }}>{r.name}</div>
                  <div style={{ display: "flex", fontSize: 22, color: style.accent }}>
                    {style.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: FAINT }}>
          observatory.fortitude-omnis.group
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
