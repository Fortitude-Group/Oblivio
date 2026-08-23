# Public API Changelog

The public API is a published contract (constitution Principle II). The path
carries the major version. A breaking change to any response shape, field
meaning, or removal of an endpoint means a new major version at `/api/v2`;
`/api/v1` keeps working. Additive fields are not breaking.

Consumers should not assume undocumented fields are stable.

## v1 — 2026-08-23

Initial public surface, all read-only, no account required, attribution
requested, fair use 120 req/min per IP:

- `GET /api/v1/packages/{ecosystem}/{name}` — current health + decomposed signals.
- `GET /api/v1/packages/{ecosystem}/{name}/history` — daily score history.
- `GET /api/v1/lists/{slug}` — a leaderboard, paginated.
- `GET /api/v1/ecosystems/{ecosystem}` — per-ecosystem summary.
- `GET /api/v1/headline` — the universe-wide headline finding.
- `GET /api/v1/search?q=` — package search.

Guarantees: every response includes `as_of` and `attribution`; a non-numeric
verdict (`insufficient_data` / `archived`) returns a null `overall_score` and,
for insufficient data, an `insufficient_data_reason` — never a fabricated number.
