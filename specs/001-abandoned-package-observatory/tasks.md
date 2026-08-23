---

description: "Task list for The Observatory — abandoned-package health observatory"
---

# Tasks: The Observatory — Abandoned-Package Health Observatory

**Input**: Design documents from `specs/001-abandoned-package-observatory/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle III) requires comprehensive tests for public contracts at merge, and the plan defines a blocking fairness harness (Gate A) plus API and scoring-engine contract tests. Test-first ordering is encouraged but not mandatory; what blocks merge is coverage.

**Organization**: Tasks are grouped by user story. The data pipeline, shared scoring engine, database, and shared image/OG generation are genuinely blocking prerequisites for every user-facing surface, so they live in the Foundational phase. Each user story is an independently testable increment layered on that foundation.

> **Revised after `/speckit-analyze`**: OG-image generation moved into Foundational (was in US4) so US1/US2 shareability and US2's own test no longer depend on a later phase; the Signal catalogue is now code-canonical (no DB table); changelog/version-pinning tasks added for both published contracts; per-signal edge-case unit tests, a no-blame-framing check, and a read-only guard added.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1..US5 for user-story phases; Setup/Foundational/Polish carry no story label
- Paths follow the monorepo layout in plan.md (pnpm workspaces: `packages/`, `apps/web`, `services/pipeline`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialisation and tooling

- [X] T001 Initialise pnpm-workspace monorepo at repo root (`pnpm-workspace.yaml`, root `package.json`) per plan.md structure (Turborepo not adopted; `pnpm -r` + `tsc`/`vitest` suffice at current scale)
- [X] T002 [P] Configure TypeScript 5.x base config and path aliases in `tsconfig.base.json` (+ root `tsconfig.json` with paths)
- [X] T003 [P] Configure Prettier in `.prettierrc` and wire the `lint` gate to it (ESLint deferred; formatting gate is green)
- [X] T004 [P] Add local dev stack (Postgres 16 + Redis 7) in `docker-compose.dev.yml` with a `pnpm dev:stack` script
- [X] T005 [P] Scaffold Vitest config at root in `vitest.config.ts`
- [X] T006 [P] Add CI workflow running `lint`, `build`, `test`, `test:fairness` in `.github/workflows/ci.yml`
- [X] T007 Create workspace package skeletons (`packages/core`, `packages/config`, `packages/db`, `packages/scoring-engine`, `packages/ingestion`, `apps/web`, `services/pipeline`) with `package.json` + `src/index.ts`

**Checkpoint**: `pnpm install && pnpm build` succeeds on empty packages; dev stack boots.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared data pipeline, scoring engine, store, and image generation that every user story depends on

**⚠️ CRITICAL**: No user story can be implemented until this phase is complete. The fairness gate (T029) blocks any score from publishing.

### Shared types & config

- [X] T008 [P] Define shared domain types and the verdict enum (`actively_maintained | stable_low_activity | slowing_down | at_risk | archived | insufficient_data`) in `packages/core/src/types.ts` (per data-model.md)
- [X] T009 [P] Implement placement-agnostic config (base URL, brand tokens, on-ramp visibility) in `packages/config/src/index.ts` (FR-027/028, research item 9)

### Database (data-model.md)

- [X] T010 Set up Drizzle schema + migration framework in `packages/db/src/schema/`, `packages/db/drizzle.config.ts`, `packages/db/src/migrate.ts`, and `packages/db/migrations/` (postgres.js driver; connection layer documented as swappable to Neon serverless on Azure for scale-to-zero cost)
- [X] T011 [P] Define `Ecosystem`, `Package`, `Repository` tables + relations in `packages/db/src/schema/packages.ts`
- [X] T012 [P] Define `DependencyEdge` table in `packages/db/src/schema/dependencies.ts`
- [X] T013 [P] Define append-only `ScoreSnapshot` (deletion-guarded via a DB trigger; physical month-partitioning deferred until volume warrants it, Principle V) + `ScoreDaily` rollup in `packages/db/src/schema/scores.ts` (FR-011, Principle X guard)
- [X] T014 [P] Define `WorkingUniverse` snapshot + `Leaderboard` + `ValidationLabel` tables in `packages/db/src/schema/meta.ts` (no `Signal` or `MethodologyDoc` tables — both are code-canonical/generated per data-model.md)
- [X] T015 Implement data-access repositories (packages, scores, history, universe) in `packages/db/src/repositories/` with Zod boundary validation
- [X] T016 [P] Write data-access integration tests (insufficient-data invariant, append-only trigger, monorepo attribution, universe persistence) in `packages/db/tests/repositories.test.ts` (6 tests, green against local Postgres; skip without `DATABASE_URL`)

### Scoring engine (contracts/scoring-engine.md) — the shared model

- [X] T017 [P] Implement each signal as a pure function exporting its `{ key, displayName, description, weight, direction }` constant (time_since_release, release_cadence_trend, commit_activity_trend, issue_response_latency+trend, pr_merge_latency, open_pr_backlog, bus_factor/contributor_concentration, maintainer_departure) in `packages/scoring-engine/src/signals/activity.ts` (FR-005; signal catalogue is code-canonical, F1)
- [X] T018 [P] Implement fairness harm-signal inputs (unanswered security issues, dependent-breakage, neglected open PRs, semver stagnation with open bugs, looking-for-maintainer) in `packages/scoring-engine/src/signals/harm.ts` (Gate A weighting, FR-008)
- [X] T019 Implement the weighted rubric + verdict mapping + confidence + hard overrides (archived/deprecated, insufficient_data) in `packages/scoring-engine/src/rubric.ts` (depends on T017, T018; global weights, FR-009)
- [X] T020 Expose the versioned `scorePackage(inputs): ScoreResult` interface + the exported `SIGNAL_CATALOGUE` in `packages/scoring-engine/src/index.ts` (contracts/scoring-engine.md, Principle II)
- [X] T021 [P] Write scoring-engine contract tests: decomposability (overallScore == Σ subScore*weight), determinism, hard overrides, no-fabricated-number for missing repo, global-weights invariant in `packages/scoring-engine/tests/contract.test.ts` (7 tests, green)
- [X] T022 [P] Write per-signal unit tests covering edge/boundary/malformed inputs (empty history, single data point, extreme latencies, null repo) in `packages/scoring-engine/tests/signals.test.ts` (9 tests, green — Principle III, U1)
- [X] T023 Establish the scoring-engine contract versioning discipline: SemVer, `packages/scoring-engine/CHANGELOG.md`, and the consumer-pinning note (the Observatory pipeline and OSPulse both pin a version) per Principle II (D1, FR-026)

### Ingestion (pluggable adapters, research items 2–4)

- [X] T024 [P] Define registry adapter interface + npm adapter (metadata, releases, downloads, declared repo/licence) in `packages/ingestion/src/registries/{types.ts,npm.ts}` (verified live against real packages; dependency-edge extraction lands with T028)
- [X] T025 [P] Implement PyPI registry adapter (JSON API + pypistats downloads) in `packages/ingestion/src/registries/pypi.ts` (verified live: pypi/requests → actively_maintained)
- [X] T026 [P] Define repo-host interface + GitHub App adapter (App-JWT → installation token, commits/releases/contributors/open-PR count, archived override) in `packages/ingestion/src/repos/{types.ts,github.ts}` + `packages/ingestion/src/github/auth.ts` (verified live: 5k req/hr, lodash/react/request incl. archived detection). Conservative harm mining added in `packages/ingestion/src/repos/harm.ts` (looking-for-maintainer from description/topics/disabled; unanswered security issues) — verified live to fire (gulp-util) without false-positiving healthy packages (lodash), protecting Gate A. NOTE still pending: issue/PR latency signals, ETag conditional-request caching, and the noisier harm signals (dependent-breakage, neglected-PR judgement, semver stagnation) which need dependent-graph/triage data to stay fairness-safe
- [X] T027 [P] Implement GitLab REST adapter (public projects; optional token) in `packages/ingestion/src/repos/gitlab.ts` (parity with GitHub; less exercised)
- [X] T028 Implement the universe builder: build per-ecosystem dependency graph, compute transitive dependents (reverse reachability, `packages/ingestion/src/universe/graph.ts` + `build.ts`), rank (downloads tiebreak), persist a reproducible `WorkingUniverse` snapshot (FR-003, research item 4). Verified live: `scripts/build-universe.ts` built and scored 44 npm + 18 PyPI members, persisted the snapshots, and marked membership/ranks. Seed is the current working set (bounded); scaling toward the full registry is a data-pipeline concern, not an algorithm change

### Fairness gate (Gate A / SC-001) — blocking

- [X] T029 Build the hand-labelled validation set (abandoned / active / finished_healthy, with rationale) in `packages/scoring-engine/tests/validation-set.ts` and a blocking harness asserting ≥95% precision on `finished_healthy` in `packages/scoring-engine/tests/fairness.test.ts`, wired to `pnpm test:fairness` (4 tests, green — research item 7, FR-033, SC-001)

### Pipeline (services/pipeline, FR-012)

- [X] T030 Set up BullMQ queue (`services/pipeline/src/queue.ts`, ioredis → Redis) + worker/scheduler (`services/pipeline/src/worker.ts`, a repeatable heartbeat that re-enqueues the universe) + per-source cadence config (`services/pipeline/src/schedule/cadence.ts`: registry daily, downloads/deep-repo weekly) (research item 3); verified live processing jobs
- [X] T031 Implement the `ingest-registry` + `refresh-repo` + `score` + `rollup-daily` sequence as `refreshPackage` in `services/pipeline/src/refresh.ts` (registry → repo + harm → scoreAndPersist), driven by the worker; verified live scoring real packages with the append-only history and daily rollup
- [X] T032 Implement structured JSON logging + per-package/per-run tracing and the access_state (rate-limited/last-known) fallback in `services/pipeline/src/observability.ts` (Principle IV, FR-013); verified in the live run
- [X] T033 Implement the ISR revalidation hook (`services/pipeline/src/revalidate.ts` → `apps/web/app/api/revalidate/route.ts`, token-protected `revalidatePath`) so a score change regenerates only the affected pages (research item 1, F3); verified live (`revalidate.sent ok:true`)

### Shared image generation (moved here from US4 so US1/US2 can depend on it, C1)

- [X] T034 [P] Implement OG/social image generation (Next `ImageResponse`/Satori) for `pkg` and `list` kinds in `apps/web/app/og/pkg/...` and `apps/web/app/og/list/...`, rendered from score data (FR-023, research item 8); verified live (1200×630 PNGs). Consumed by US1 page meta (T042) and US2 list metadata (T055).

**Checkpoint**: One package can be ingested, scored (or marked insufficient_data), snapshotted, rolled up, and rendered as an OG image; `pnpm test:fairness` passes. User stories can now begin, in parallel.

---

## Phase 3: User Story 1 — Searcher gets a fair verdict on one package (Priority: P1) 🎯 MVP

**Goal**: A fast, fair, SEO-excellent per-package health page: verdict, signal breakdown, trend, key facts, honest "insufficient data", and repo/registry/methodology links.

**Independent Test**: Open `/npm/lodash`; see the verdict, per-signal decomposition, trend chart, key facts, and "last updated"; open the no-repo fixture and see "insufficient data" with no number; CWV within LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1.

### Tests for User Story 1

- [X] T035 [US1] Playwright E2E of the package page (verdict + signals + facts + last-updated + links, and the insufficient-data path with no fabricated score) in `apps/web/e2e/package-page.spec.ts` (green)
- [X] T036 [US1] CWV assertion in `apps/web/e2e/cwv.spec.ts` (green): CLS < 0.1 strict, LCP dev-tolerant. NOTE: the SC-007 p75 LCP ≤ 2.5s gate is a Lighthouse run against `next start`, a follow-up

### Implementation for User Story 1

- [X] T037 [US1] Implement the per-package ISR route `apps/web/app/[ecosystem]/[package]/page.tsx` (revalidate=3600) reading current score + facts via `packages/db` (research item 1); verified live rendering real DB scores
- [X] T038 [US1] Build the verdict + signal-breakdown (every number traces to a signal with per-signal contribution points, Principle XII) — rendered in the package route with colour-coded bars
- [ ] T039 [US1] Build the trend chart from `ScoreDaily` (FR-011) — PARTIAL: trend shown as a direction chip; a real chart waits until history has more than one snapshot per package
- [X] T040 [US1] Build the key-facts panel (release, version, downloads, bus factor, licence, trend, incl. "last updated") (FR-013)
- [X] T041 [US1] Build the insufficient-data state (reason shown, no numeric score) (FR-007)
- [X] T042 [US1] Add SEO markup: metadata, canonical (config-driven host), Open Graph/Twitter tags, and JSON-LD (SoftwareSourceCode) via `generateMetadata` on the package route (FR-016). NOTE: OG *image* generation (T034) still pending; tags reference it
- [X] T043 [US1] Add XML sitemap covering the universe in `apps/web/app/sitemap.ts` (home, methodology, lists, ecosystems, and every package; 72 URLs live) plus `app/robots.ts` pointing at it (FR-016). NOTE: single file for now; `generateSitemaps` chunking kicks in past ~50k URLs.
- [X] T044 [US1] Apply Fortitude/OSPulse house style to the page shell (`apps/web/app/layout.tsx` + `globals.css`: cinematic dark theme, glass panels, animated score ring) (FR-028); also a home showcase grid, `not-found`, and a generated `/methodology` page (partial T046) and a config-driven OSPulse on-ramp (partial US5)

**Checkpoint**: MVP. A searcher can land on a fair, fast, indexed, shareable package page; insufficient-data is honest. Deployable/demoable.

---

## Phase 4: User Story 3 — Methodology makes the numbers defensible (Priority: P1)

**Goal**: A full, honest methodology page documenting every signal, the rubric/weights, fairness rules, meaning/limits, data sources, and cadence, linked from every score. (P1: ships with v1; a score without it is not shippable.)

**Independent Test**: From any score, reach `/methodology`; confirm it documents every signal used, the computation, the fairness rules, what the score does not mean, sources, and cadence; two same-verdict packages show the same rule-driven breakdown.

### Tests for User Story 3

- [ ] T045 [P] [US3] E2E test: every score links to methodology; two same-verdict packages share rule-driven breakdowns (no per-package tuning) in `apps/web/tests/e2e/methodology.spec.ts` (FR-009)

### Implementation for User Story 3

- [X] T046 [US3] Generate the methodology page from the scoring-engine's exported `SIGNAL_CATALOGUE` + weights + the fairness rule in `apps/web/app/methodology/page.tsx` (FR-021; code-canonical so it cannot drift, F1)
- [X] T047 [US3] Added the "insufficient data ≠ low score" and "maintenance health ≠ vulnerability scanning" explanations to the methodology page (FR-032, spec scope note)
- [X] T048 [US3] Every score surface links to `/methodology` (package page "Full methodology →" and "How we score →" links; footer note on lists) (FR-009)

**Checkpoint**: Numbers are defensible and consistently rule-driven. US1 + US3 = a complete, trustworthy single-package utility.

---

## Phase 5: User Story 2 — Browser explores the state of the ecosystem (Priority: P2)

**Goal**: Front-page headline finding over the persisted universe, per-ecosystem overviews, leaderboards (each its own URL + OG card), and search.

**Independent Test**: Open `/`; see the headline finding, ecosystem breakdown, and "as of" date; the headline share matches the referenced universe snapshot; open each leaderboard and ecosystem page at its own URL; search a name and land on its page.

### Tests for User Story 2

- [X] T049 [US2] Playwright E2E: front page headline + verdict breakdown, and ecosystem overview headline, in `apps/web/e2e/front-and-lists.spec.ts` (green)
- [X] T050 [US2] Playwright E2E: leaderboard URL renders ranked items + inclusion_note, and search navigates to a package, in `apps/web/e2e/front-and-lists.spec.ts` (green)

### Implementation for User Story 2

- [X] T051 [US2] Implement the front page headline finding (abandonment share over the persisted `WorkingUniverse` with an auditable denominator, verdict breakdown, and "as of" date) in `apps/web/app/page.tsx` + `lib/data.ts:getUniverseHeadline` (FR-017, SC-009); verified live showing "2% of 62" with the breakdown
- [X] T052 [US2] Implement leaderboard route `apps/web/app/lists/[slug]/page.tsx` + a `/lists` index, with each list's inclusion_note (FR-018); verified live (single-maintainer, archived-still-used, etc.)
- [X] T053 [US2] Define the five leaderboards (at-risk, single-maintainer, declining, archived-still-used, healthiest) code-canonically in `apps/web/lib/leaderboards.ts` (each a predicate + sort + inclusion note; the DB `leaderboards` table stays available for future dynamic definitions)
- [X] T054 [US2] Implement ecosystem overview route `apps/web/app/[ecosystem]/page.tsx` with per-ecosystem headline share, universe size, verdict distribution, "as-of", and members ranked by dependents (FR-020, FR-013); verified live at `/npm` and `/pypi`. Also implemented package **search** (FR-019): a client typeahead (`apps/web/components/Search.tsx`) on the home page, verified navigating to a package.
- [X] T055 [US2] Wire OG cards (via the T034 generator) + internal linking for front/list pages (home links to every list; list metadata sets `og:image`) (FR-016/023). NOTE: the XML sitemap (T043) is still pending

**Checkpoint**: The press/social surfaces work and are shareable; US1 + US2 + US3 independently functional.

---

## Phase 6: User Story 4 — Badges, share cards, and open data (Priority: P3)

**Goal**: The distribution multipliers: read-only public API v1, embeddable badge, all edge-cached and abuse-controlled without accounts. (OG image generation was delivered in Foundational T034.)

**Independent Test**: `GET /api/v1/packages/npm/lodash` returns schema-valid JSON with signals + as_of + attribution, no account; `/badge/npm/lodash.svg` is verdict-coloured and links back; hammering the API returns 429 + Retry-After while cached traffic is unaffected.

### Tests for User Story 4

- [X] T056 [US4] Contract tests for the `/api/v1` endpoints (schema, attribution, decomposed signals, pagination, 404s, search, and 429+Retry-After) in `apps/web/tests/contract/public-api.test.ts` (8 tests, green; hermetically self-seeded)
- [X] T057 [US4] Badge contract test (verdict-coloured SVG, correct content-type/cache) folded into `public-api.test.ts`; OG PNG generation verified live (1200×630). NOTE: an automated OG-image assertion is deferred (ImageResponse is awkward to unit-test)

### Implementation for User Story 4

- [X] T058 [US4] Implement `/api/v1` route handlers (packages, package history, lists, ecosystems, headline, search) in `apps/web/app/api/v1/` with attribution + `as_of` + CORS + cache headers, and the insufficient-data shape (null score + reason) (contracts/public-api.md); verified live
- [X] T059 [US4] Implement the badge endpoint (verdict-coloured SVG, neutral insufficient-data/archived per FR-032, link-back via README embed) in `apps/web/app/badge/[ecosystem]/[package]/route.ts` (FR-022); verified live (887B SVG). Also surfaced an "Embed the badge" section with a copy-ready snippet on the package page
- [X] T060 [US4] Add cache headers + per-IP fixed-window rate limiting (429/Retry-After, 120 req/min) in `apps/web/lib/api.ts` (research item 6, SC-008); API + badge + OG all carry `cache-control`. NOTE: the limiter is in-memory (single instance); a multi-instance deploy moves it to Redis without changing callers
- [X] T061 [US4] Write public API docs (endpoints, fair-use limits, attribution request) in `apps/web/app/api-docs/page.tsx` (FR-024)
- [X] T062 [US4] Establish public API versioning discipline: `/api/v1` path stability, `apps/web/app/api/CHANGELOG.md`, and the "breaking change → /api/v2" rule per Principle II (D1)

**Checkpoint**: The utility can spread itself via badges/API/OG; normal traffic stays free and uncapped.

---

## Phase 7: User Story 5 — Honest OSPulse on-ramp (Priority: P3)

**Goal**: A single, non-alarmist OSPulse prompt on package and list pages, framed as whole-tree/continuous/alerting, with nothing gated.

**Independent Test**: On a package page and a list, confirm one honest OSPulse prompt (config-driven visibility) with all data fully present and no gate.

### Tests for User Story 5

- [X] T063 [US5] Playwright E2E: exactly one on-ramp block with both the OSPulse and PoisonBox CTAs, and the full signal breakdown present (nothing gated) in `apps/web/e2e/on-ramp.spec.ts` (SC-008, green)

### Implementation for User Story 5

- [X] T064 [US5] Build the config-driven on-ramp (whole-tree/continuous/alerting copy, generosity-preserving) with an OSPulse CTA and a second **PoisonBox** CTA, both from `@observatory/config` (FR-025, config from T009)
- [X] T065 [US5] Place the on-ramp on the package page behind the config visibility slot (FR-025); verified live with both buttons. NOTE: list-page placement still pending

**Checkpoint**: All five stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Openness, framing integrity, accessibility, scale hardening, and end-to-end validation

- [X] T066 [P] Document the project openly in `README.md` (what it is, the fairness/honesty rules, how to run, the API, methodology) with attribution to Fortitude Omnis (FR-029). NOTE: the repo currently lives in private ADO; making it public is a deployment call.
- [X] T067 [P] Accessibility pass across public pages, verified by an axe-core check in `apps/web/e2e/a11y.spec.ts` (home, package, list, methodology — no serious/critical WCAG 2 A/AA violations; lightened faint-text contrast to pass)
- [X] T068 Scale/freshness hardening: a cadence dry-run (`cadenceFits` in `schedule/cadence.ts` + `services/pipeline/tests/cadence.test.ts`, 3 tests green) proves a 10k (and 50k) universe fits the GitHub budget on the weekly deep-repo cadence, and that 100k/day does not (Gate C / SC-004)
- [X] T069 [P] Telematics-exclusion guard in `scripts/check-examples.ts`, wired into `pnpm guards` and CI (FR-034); passes
- [X] T070 [P] No-blame framing guard in `scripts/check-framing.ts`, wired into `pnpm guards` and CI (FR-030, G1); passes
- [X] T071 [P] Read-only guard in `scripts/check-read-only.ts` (only the GitHub App token mint writes; no repo mutations), wired into `pnpm guards` and CI (FR-031, G3); passes
- [X] T072 Updated `quickstart.md` to the real commands and validated it end to end (setup, fairness gate, ingest, universe build, site, API, badge, full gate)
- [X] T073 Merge gate green: `pnpm lint && pnpm build && pnpm test && pnpm test:fairness && pnpm guards` (60 tests) plus `pnpm test:e2e` (12 Playwright specs incl. CWV + a11y)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies; start immediately.
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories. The fairness gate (T029) blocks publishing any score. OG generation (T034) is here so US1/US2 can depend on it.
- **User Stories (Phases 3–7)**: all depend on Foundational. US1 first (MVP). US3 (also P1) and US2/US4/US5 can then proceed in parallel; they share the foundation but touch different files.
- **Polish (Phase 8)**: depends on the desired user stories being complete.

### User story dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories (OG generator already exists from T034).
- **US3 (P1)**: after Foundational. Reads the exported signal catalogue/rubric constants; links from US1's scores but is independently testable via `/methodology`.
- **US2 (P2)**: after Foundational. Uses the T034 OG generator; links to US1 pages but renders and tests independently (T050 no longer depends on a later phase).
- **US4 (P3)**: after Foundational. Serves the same data via API/badge; independent of US1–US3 rendering.
- **US5 (P3)**: after Foundational. Adds a component to existing pages; independent surface.

### Within a story

- Tests may be written first (encouraged) or alongside; coverage must be green at merge (Principle III).
- Schema before repositories before routes; components before the route that composes them; core before integration.

### Parallel opportunities

- Setup: T002–T006 in parallel.
- Foundational: T008/T009 parallel; schema T011–T014 parallel; signal modules T017 + harm T018 parallel; contract/unit tests T021/T022 parallel; registry adapters T024/T025 and repo adapters T026/T027 parallel; observability T032 and OG generation T034 parallel. Serial joins: T019 (waits on T017/T018), T020 (waits on T019), T028 (waits on adapters), T029 (waits on rubric), T023 (after the interface T020).
- After Foundational: US1, US3, US2, US4, US5 can be staffed concurrently.
- Within a story, all [P] component/test tasks run in parallel.

---

## Parallel Example: Foundational scoring + ingestion + images

```bash
# Signals + harm (independent files) together:
Task: "Signal pure functions in packages/scoring-engine/src/signals/*.ts"   # T017
Task: "Harm-signal inputs in packages/scoring-engine/src/signals/harm.ts"   # T018
# Registry + repo adapters together:
Task: "npm registry adapter in packages/ingestion/src/registries/npm.ts"    # T024
Task: "PyPI registry adapter in packages/ingestion/src/registries/pypi.ts"  # T025
Task: "GitHub adapter in packages/ingestion/src/repos/github.ts"            # T026
Task: "GitLab adapter in packages/ingestion/src/repos/gitlab.ts"           # T027
# Shared image generation, in parallel with the above:
Task: "Satori OG generation in apps/web/app/og/[...].ts"                    # T034
```

## Parallel Example: User Story 1 surfaces

```bash
Task: "SignalBreakdown component in apps/web/components/SignalBreakdown.tsx"   # T038
Task: "TrendChart component in apps/web/components/TrendChart.tsx"             # T039
Task: "KeyFacts component in apps/web/components/KeyFacts.tsx"                  # T040
Task: "InsufficientData component in apps/web/components/InsufficientData.tsx" # T041
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational (fairness gate green) → 3. Phase 3 US1 → 4. STOP and validate `/npm/lodash` independently → 5. Deploy/demo.

### Incremental delivery

Foundational → US1 (MVP, fair single-package page) → US3 (methodology makes it defensible; US1+US3 is the complete trustworthy utility) → US2 (headline + lists for reach) → US4 (badges/API for distribution) → US5 (OSPulse on-ramp). Each ships without breaking the last.

### Parallel team strategy

Team completes Setup + Foundational together (heaviest phase; fan out signals, adapters, schema, OG generation). Once the fairness gate is green: one track on US1, one on US2, one on US4, with US3 and US5 folded in as they attach to existing pages.

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- The Foundational phase is large because this is a data product: the pipeline, shared engine, and shared image generation are the real foundation, and the public surfaces are thin consumers of them (plan.md Structure Decision).
- Gate A (T029) is a hard, blocking test: no score publishes until finished-but-healthy precision ≥95% (SC-001).
- Every rendered figure must trace to a signal breakdown or a persisted aggregate (Principle XII); insufficient data is never a low score (FR-007/032).
- The scoring engine is the shared model consumed by OSPulse (FR-026); treat its interface as a versioned public contract (Principle II, T023).
- The Signal catalogue is code-canonical (exported from the engine); the methodology page is generated from it so the two cannot drift (F1).
- Commit after each task or logical group; keep the tracker in sync (Principle VII).
