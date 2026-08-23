# Quickstart & Validation Guide: The Observatory

**Feature**: 001-abandoned-package-observatory | **Updated**: 2026-08-23

Runnable steps that prove the feature works end to end. Updated to match the
implemented commands. Requires Node 22, pnpm, and Docker.

## Setup

```bash
pnpm install
pnpm dev:stack                                  # Postgres (host 5433) + Redis (host 6380)
pnpm --filter @observatory/db db:migrate        # schema + append-only guard trigger
```

Local DB URL: `postgres://observatory:observatory@localhost:5433/observatory`
(set `DATABASE_URL` to it for the commands below).

Repo ingestion needs a GitHub App credential in the environment
(`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY_PATH`).

## The fairness gate first (Gate A / SC-001)

```bash
pnpm test:fairness
```
The rubric must keep ≥95% precision on the finished-but-healthy class, and no
finished-healthy fixture may be labelled at risk. A failure here is a hard stop.

## Scenario 1 — Score one real package (US1)

```bash
pnpm exec tsx scripts/ingest-one.ts npm lodash
pnpm exec tsx scripts/ingest-one.ts npm request    # expect: archived
pnpm exec tsx scripts/ingest-one.ts pypi requests  # expect: actively_maintained
```
Each run resolves the repo, fetches live GitHub activity, mines harm signals,
scores, and persists a snapshot. An unresolvable repo prints `insufficient_data`
with no number.

## Scenario 2 — Build a universe and the headline (US2)

```bash
pnpm exec tsx scripts/build-universe.ts npm
pnpm exec tsx scripts/build-universe.ts pypi
pnpm --filter @observatory/web dev                 # http://localhost:3010
```
Open `/` for the headline finding over the persisted universe, `/npm` and `/pypi`
for the per-ecosystem overviews, `/lists/single-maintainer` for the leaderboards,
and use the search box to jump to any package.

## Scenario 3 — Per-package page, badge, API (US1/US4)

- `/npm/lodash` — verdict, decomposed signals, key facts, the embed badge, and the
  OSPulse + PoisonBox on-ramp.
- `GET /api/v1/packages/npm/lodash` — schema-valid JSON with signals, `as_of`, and
  `attribution`, no account required.
- `GET /badge/npm/lodash` — the embeddable SVG badge.
- Hammer the API past 120 req/min and get a `429` with `Retry-After`.

## Full gate

```bash
pnpm lint            # prettier
pnpm build           # tsc --noEmit across the workspace
pnpm test            # 60 unit + integration tests (DB tests need DATABASE_URL)
pnpm test:fairness   # the blocking fairness gate
pnpm guards          # no-blame framing, telematics exclusion, read-only
pnpm test:e2e        # 12 Playwright specs incl. CWV and accessibility (needs the site running with data)
```

All green is the Definition of Done for the implemented slice. Note: `pnpm test`
truncates the database to seed hermetic fixtures, so rebuild the universe
afterwards if you want the live site populated again.
