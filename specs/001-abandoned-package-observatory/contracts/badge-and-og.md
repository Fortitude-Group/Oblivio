# Contract: Badge & Open Graph Image Endpoints

**Feature**: 001-abandoned-package-observatory | **Status**: v1

Distribution multipliers (FR-022, FR-023). No accounts; edge-cached; abuse-controlled by cache + per-IP rate limiting (research item 6).

## Badge — `GET /badge/{ecosystem}/{name}.svg`
- Returns an SVG (PNG fallback at `.png`) showing the current verdict, e.g. label `Observatory` + message `stable` colour-coded by verdict.
- The badge's link target (for README embedding) is the package health page `/{ecosystem}/{name}` (FR-022).
- Optional `?style=flat|for-the-badge&label=` cosmetic params.
- **Cache**: short `s-maxage` (e.g. ≤1h) + `stale-while-revalidate` so it tracks the current verdict without hammering origin. `ETag` per (package, verdict).
- **Insufficient data**: message `insufficient data`, neutral colour — never a red/"dead" colour (FR-032).
- **Contract tests**: valid SVG; colour maps to verdict; unknown package → neutral "unknown" badge, `404`-cache-safe; link-back URL correct.

## OG image — `GET /og/{kind}/{...}.png`
- `kind` ∈ `package` (`/og/package/{ecosystem}/{name}.png`) and `list` (`/og/list/{slug}.png`).
- Renders verdict + trend (package) or list title + top entries (list) using Satori, from the same score data.
- **Cache**: keyed by (target, verdict/trend); regenerated on demand after a score change.
- Referenced by the page's `og:image` / `twitter:image` meta (FR-016).
- **Contract tests**: returns a valid PNG of the declared dimensions; content reflects current verdict/trend; caching headers present.

## Rate limiting (both)
- Per-IP token bucket in Redis; `429` + `Retry-After` when exceeded. Normal README/social traffic served from edge cache and never rate-limited (SC-008 — the utility stays freely usable).
