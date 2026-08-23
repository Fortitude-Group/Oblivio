import { getPackageView } from "../../../../lib/data";
import type { Verdict } from "@observatory/core";

export const runtime = "nodejs";

// Verdict → short badge message + colour. Insufficient/archived stay neutral,
// never a red "dead" colour (spec FR-032).
const BADGE: Record<Verdict, { msg: string; colour: string }> = {
  actively_maintained: { msg: "maintained", colour: "#2ea043" },
  stable_low_activity: { msg: "stable", colour: "#1f9ed1" },
  slowing_down: { msg: "slowing down", colour: "#dd9800" },
  at_risk: { msg: "at risk", colour: "#d4493f" },
  archived: { msg: "archived", colour: "#6b7280" },
  insufficient_data: { msg: "unknown", colour: "#6b7280" },
};

const LABEL = "observatory";

// Rough width per character at 11px in the badge font.
function textWidth(s: string): number {
  return s.length * 6.7 + 14;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<"
      ? "&lt;"
      : c === ">"
        ? "&gt;"
        : c === "&"
          ? "&amp;"
          : c === "'"
            ? "&apos;"
            : "&quot;",
  );
}

function badge(message: string, colour: string): string {
  const lw = Math.round(textWidth(LABEL));
  const mw = Math.round(textWidth(message));
  const w = lw + mw;
  const font =
    "font-family='Verdana,DejaVu Sans,Geneva,sans-serif' font-size='11'";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${LABEL}: ${escapeXml(message)}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#2a2d34"/>
    <rect x="${lw}" width="${mw}" height="20" fill="${colour}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" ${font}>
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${LABEL}</text>
    <text x="${lw / 2}" y="14">${LABEL}</text>
    <text x="${lw + mw / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(message)}</text>
    <text x="${lw + mw / 2}" y="14">${escapeXml(message)}</text>
  </g>
</svg>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ecosystem: string; package: string }> },
) {
  const { ecosystem, package: raw } = await params;
  const name = decodeURIComponent(raw);
  const view = await getPackageView(ecosystem, name);
  const verdict = (view?.snapshot?.verdict ?? "insufficient_data") as Verdict;
  const { msg, colour } = BADGE[verdict];

  return new Response(badge(msg, colour), {
    headers: {
      "content-type": "image/svg+xml",
      // Track the current verdict without hammering origin.
      "cache-control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
