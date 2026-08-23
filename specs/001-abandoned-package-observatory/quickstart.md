# Quickstart & Validation Guide: The Observatory

**Feature**: 001-abandoned-package-observatory | **Date**: 2026-08-22

Runnable scenarios that prove the feature works end-to-end. These map to the spec's user stories and success criteria; they are validation steps, not implementation. Commands assume the pnpm monorepo (`pnpm install` at root) with Postgres + Redis available (a `docker compose up` dev stack provides both).

## Prerequisites
- Node.js 22 LTS, pnpm, Docker (Postgres 16 + Redis 7 dev stack).
- A GitHub App credential and a GitLab token in the dev `.env` (never committed) for repo ingestion.
- `pnpm db:migrate` to create the schema; `pnpm db:seed:validation` to load the labelled validation set.

## Fairness gate first (Gate A / SC-001 — blocks everything)
```
pnpm test:fairness
```
**Expected**: the rubric scores the hand-labelled set with ≥95% precision on the `finished_healthy` class; no `finished_healthy` package is labelled `at_risk`/`slowing_down`. A failure here is a hard stop — no scores publish (research item 7, contract guarantee 3).

## Scenario 1 — Searcher gets a fair verdict (US1, P1)
1. `pnpm pipeline:ingest --package npm/lodash` then `pnpm pipeline:score --package npm/lodash`.
2. Start the site: `pnpm --filter web dev`.
3. Open `/npm/lodash`.
- **Expected**: plain-language verdict, per-signal breakdown, trend chart, key facts (last release, maintainers, bus factor, dependents, licence), links to repo/registry/methodology, and a visible "last updated". CWV check (`pnpm test:cwv -- /npm/lodash`) reports LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (SC-007).
4. Open a package with an unresolvable repo (fixture `npm/__no-repo-fixture`).
- **Expected**: "insufficient data" with reason, **no numeric score** (FR-007).

## Scenario 2 — Browser explores the ecosystem (US2, P2)
1. Run a universe build over the seed set: `pnpm pipeline:universe:build`.
2. Open `/` (front page).
- **Expected**: headline finding (at-risk share over the persisted WorkingUniverse), ecosystem breakdown, and an "as of" date. Cross-check: `GET /api/v1/headline` → `at_risk_share` matches the count derivable from the referenced universe snapshot (Principle XII).
3. Open `/lists/single-maintainer` and `/npm` (ecosystem overview).
- **Expected**: each has its own stable URL, ranked items, `inclusion_note`, and an OG card (`/og/list/single-maintainer.png` returns a valid PNG).
4. Search a name in the search box → lands on its health page (FR-019).

## Scenario 3 — Methodology makes numbers defensible (US3, P1)
1. From any score, follow the methodology link → `/methodology`.
- **Expected**: every signal, the rubric and weights, the fairness rules, what the score does/does not mean (maintenance health ≠ vuln scanning), data sources/limits, and update cadence. Two packages with the same verdict show the same rule-driven breakdown (no per-package tuning, FR-009).

## Scenario 4 — Badges, share cards, open data (US4, P3)
1. `GET /badge/npm/lodash.svg` → valid SVG, verdict-coloured, links back to `/npm/lodash`.
2. `GET /api/v1/packages/npm/lodash` → schema-valid JSON with `signals[]`, `as_of`, `attribution`, no account required.
3. Hammer the API past the fair-use limit → `429` + `Retry-After`; normal traffic served from cache (SC-008).

## Scenario 5 — Honest OSPulse on-ramp (US5, P3)
1. On `/npm/lodash` and a list page, confirm a single, non-alarmist OSPulse prompt framed as whole-tree/continuous/alerting, with all package data fully present and nothing gated.

## Freshness & scale (Gate C / SC-004)
```
pnpm pipeline:run --universe --cadence-dry-run
```
- **Expected**: the run plan fits ≈10k packages within the configured cadence and the GitHub/GitLab + registry rate budgets (conditional requests + priority queue); every surface shows an accurate "last updated"; a rate-limited repo falls back to last-known values with an older timestamp, not a blank or a guess.

## Placement-agnostic check (FR-027)
- Set `OBSERVATORY_BASE_URL` / brand tokens in `packages/config` to a standalone value, then to an OSPulse-section value; rebuild.
- **Expected**: canonical URLs, sitemap host, and nav/branding follow config with no code change; no host hard-coded.

## Full suite (merge gate)
```
pnpm lint && pnpm build && pnpm test && pnpm test:fairness && pnpm test:e2e
```
All green + fairness gate passing + CWV within thresholds = the feature's Definition of Done for this slice.
