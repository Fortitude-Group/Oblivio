# Contract: Read-Only Public Data API (`/api/v1`)

**Feature**: 001-abandoned-package-observatory | **Status**: v1 (SemVer; breaking change → `/api/v2`)

Free, read-only, no-account API (FR-024). All responses JSON, cacheable, attribution requested. Per-IP token-bucket rate limiting; fair-use limits published here. All list responses state what they include/exclude (Principle XII). No endpoint exposes anything beyond the free public single-package data (SC-008).

## Conventions
- Base path `/api/v1`. `GET` only. `200` success; `404` unknown package; `429` rate-limited (with `Retry-After`); `503` upstream/insufficient-data-source with last-known `as_of`.
- Every payload carries `as_of` (data freshness, FR-013) and `attribution`.
- `verdict` ∈ `actively_maintained | stable_low_activity | slowing_down | at_risk | archived | insufficient_data`.

## Endpoints

### `GET /api/v1/packages/{ecosystem}/{name}`
Current health for one package.
```json
{
  "ecosystem": "npm",
  "name": "lodash",
  "verdict": "stable_low_activity",
  "overall_score": 78,
  "confidence": "high",
  "trend_direction": "stable",
  "facts": { "latest_version": "4.17.21", "latest_release_at": "2021-02-20",
             "maintainers": 3, "bus_factor": 2, "transitive_dependents": 138420, "license": "MIT" },
  "signals": [ { "key": "time_since_release", "raw_value_days": 1600, "sub_score": 0.4, "weight": 0.15,
                 "source_ref": "https://github.com/lodash/lodash/releases" } ],
  "repo_url": "https://github.com/lodash/lodash",
  "registry_url": "https://www.npmjs.com/package/lodash",
  "methodology_url": "/methodology",
  "as_of": "2026-08-22T04:00:00Z",
  "attribution": "Data: The Observatory (Fortitude Omnis)"
}
```
- Unresolvable repo → `verdict: insufficient_data`, `overall_score: null`, `confidence: insufficient_data`, and an `insufficient_data_reason` (FR-007). Never a fabricated number.

### `GET /api/v1/packages/{ecosystem}/{name}/history?from=&to=&granularity=daily`
Daily-downsampled score series (FR-011). Returns `[{ "day": "2026-08-01", "overall_score": 77, "verdict": "stable_low_activity" }]`.

### `GET /api/v1/lists/{slug}?ecosystem=&limit=&offset=`
A leaderboard (FR-018). `slug` ∈ the defined set. Response includes `inclusion_note` (what the list includes and excludes), `total`, and ranked `items`.

### `GET /api/v1/ecosystems/{ecosystem}`
Ecosystem overview stats (FR-020): universe size, verdict distribution, headline figures, `as_of`.

### `GET /api/v1/headline`
The front-page finding (FR-017): `{ "as_of", "universe_size", "at_risk_share", "by_ecosystem": [...], "criteria_version" }`. `at_risk_share` is defined over the persisted WorkingUniverse (auditable denominator).

### `GET /api/v1/search?q=&ecosystem=&limit=`
Typeahead search to a package (FR-019). Returns lightweight `{ ecosystem, name, verdict }` matches.

## Contract tests (Principle III)
- Schema conformance for every endpoint (Zod/OpenAPI), including the `insufficient_data` shape.
- `429` returns `Retry-After`; cache headers present and correct.
- `history` respects `granularity=daily`; `headline.at_risk_share` matches the count derivable from the referenced WorkingUniverse (Principle XII cross-check).
