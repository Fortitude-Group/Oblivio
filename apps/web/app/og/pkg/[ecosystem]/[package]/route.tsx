import { ImageResponse } from "next/og";
import { getPackageView } from "../../../../../lib/data";
import { VERDICT_STYLE } from "../../../../../lib/verdict";
import type { Verdict } from "@observatory/core";

export const runtime = "nodejs";

const BG = "#06070b";
const DIM = "#a3a9b8";
const FAINT = "#646b7e";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ecosystem: string; package: string }> },
) {
  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const view = await getPackageView(ecosystem, name);
  const verdict = (view?.snapshot?.verdict ?? "insufficient_data") as Verdict;
  const style = VERDICT_STYLE[verdict];
  const score = view?.snapshot?.overallScore ?? null;

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
          backgroundImage: `radial-gradient(60% 60% at 12% 0%, ${style.accent}33, transparent 60%)`,
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
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: style.accent,
            }}
          />
          THE OBSERVATORY
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, color: DIM }}>
            {ecosystem}
          </div>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 700 }}>
            {name}
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 26 }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 600,
                color: style.accent,
                padding: "12px 30px",
                borderRadius: 999,
                border: `3px solid ${style.accent}`,
                background: "rgba(255,255,255,0.05)",
              }}
            >
              {style.label}
            </div>
            {score !== null && (
              <div style={{ display: "flex", fontSize: 44, color: DIM }}>
                {Math.round(score)} / 100
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: FAINT }}>
          Is {name} still maintained? Free, honest maintenance health.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
