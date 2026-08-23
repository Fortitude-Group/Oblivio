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

- [ ] T030 Set up BullMQ queue + scheduler and per-source cadence config (registry daily, downloads weekly, deep-repo weekly/priority) in `services/pipeline/src/schedule/` (research item 3)
- [ ] T031 Implement jobs `ingest-registry`, `refresh-repo`, `score` (snapshot inputs → scorePackage → persist ScoreSnapshot → set trendDirection), and `rollup-daily` in `services/pipeline/src/jobs/*.ts` — PARTIAL: the `score` + `rollup-daily` core is implemented and tested as `scoreAndPersist` in `services/pipeline/src/score.ts` (5 tests green, engine→DB spine incl. trend derivation and insufficient-data path); `ingest-registry`/`refresh-repo` remain, blocked on the ingestion adapters (T024–T028)
- [ ] T032 [P] Implement structured logging + per-package/per-run tracing and the rate-limited/last-known-value fallback (access_state, older "last updated") in `services/pipeline/src/observability.ts` (Principle IV, FR-013, Gate C edge case)
- [ ] T033 Implement the ISR revalidation hook (pipeline notifies the web app to regenerate a package page when its score changes) in `services/pipeline/src/revalidate.ts` (research item 1). Note: the hook's target route is built in US1 (T037); wire the target when that route exists (F3).

### Shared image generation (moved here from US4 so US1/US2 can depend on it, C1)

- [X] T034 [P] Implement OG/social image generation (Next `ImageResponse`/Satori) for `pkg` and `list` kinds in `apps/web/app/og/pkg/...` and `apps/web/app/og/list/...`, rendered from score data (FR-023, research item 8); verified live (1200×630 PNGs). Consumed by US1 page meta (T042) and US2 list metadata (T055).

**Checkpoint**: One package can be ingested, scored (or marked insufficient_data), snapshotted, rolled up, and rendered as an OG image; `pnpm test:fairness` passes. User stories can now begin, in parallel.

---

## Phase 3: User Story 1 — Searcher gets a fair verdict on one package (Priority: P1) 🎯 MVP

**Goal**: A fast, fair, SEO-excellent per-package health page: verdict, signal breakdown, trend, key facts, honest "insufficient data", and repo/registry/methodology links.

**Independent Test**: Open `/npm/lodash`; see the verdict, per-signal decomposition, trend chart, key facts, and "last updated"; open the no-repo fixture and see "insufficient data" with no number; CWV within LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1.

### Tests for User Story 1

- [ ] T035 [P] [US1] E2E test of the package page (verdict + signals + facts + links + last-updated, and insufficient-data path) in `apps/web/tests/e2e/package-page.spec.ts` — PENDING (page verified live via screenshot; Playwright suite not yet written)
- [ ] T036 [P] [US1] CWV assertion test (LCP/INP/CLS thresholds) for `/npm/lodash` in `apps/web/tests/cwv/package-page.cwv.ts` (SC-007) — PENDING

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

- [ ] T046 [US3] Generate the methodology page from the scoring-engine's exported signal constants + rubric weights + fairness rules + sources/limits + cadence in `apps/web/app/(site)/methodology/page.tsx` (FR-021; code-canonical so it cannot drift, F1)
- [ ] T047 [P] [US3] Add the "insufficient data ≠ low score" and "maintenance health ≠ vulnerability scanning" explanations to the methodology page (FR-032, spec scope note)
- [ ] T048 [US3] Ensure every score surface links to `/methodology` via a shared component in `apps/web/components/MethodologyLink.tsx`

**Checkpoint**: Numbers are defensible and consistently rule-driven. US1 + US3 = a complete, trustworthy single-package utility.

---

## Phase 5: User Story 2 — Browser explores the state of the ecosystem (Priority: P2)

**Goal**: Front-page headline finding over the persisted universe, per-ecosystem overviews, leaderboards (each its own URL + OG card), and search.

**Independent Test**: Open `/`; see the headline finding, ecosystem breakdown, and "as of" date; the headline share matches the referenced universe snapshot; open each leaderboard and ecosystem page at its own URL; search a name and land on its page.

### Tests for User Story 2

- [ ] T049 [P] [US2] E2E test: front page headline + ecosystem breakdown + "as of"; headline share cross-checks the WorkingUniverse count (Principle XII) in `apps/web/tests/e2e/front-page.spec.ts`
- [ ] T050 [P] [US2] E2E test: each leaderboard URL renders ranked items + inclusion_note + OG card (via T034); search navigates to a package in `apps/web/tests/e2e/lists-and-search.spec.ts`

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

- [ ] T056 [P] [US4] Contract tests for every `/api/v1` endpoint (schema, insufficient-data shape, 429+Retry-After, headline↔universe cross-check) in `apps/web/tests/contract/public-api.test.ts` (contracts/public-api.md)
- [ ] T057 [P] [US4] Contract tests for badge + OG (valid SVG/PNG, verdict colour mapping, neutral insufficient-data badge, correct link-back) in `apps/web/tests/contract/badge-og.test.ts` (contracts/badge-and-og.md)

### Implementation for User Story 4

- [ ] T058 [US4] Implement `/api/v1` route handlers (packages, history, lists, ecosystems, headline, search) in `apps/web/app/api/v1/` (contracts/public-api.md)
- [X] T059 [US4] Implement the badge endpoint (verdict-coloured SVG, neutral insufficient-data/archived per FR-032, link-back via README embed) in `apps/web/app/badge/[ecosystem]/[package]/route.ts` (FR-022); verified live (887B SVG). Also surfaced an "Embed the badge" section with a copy-ready snippet on the package page
- [ ] T060 [US4] Add edge cache headers + Redis origin cache + per-IP token-bucket rate limiting (429/Retry-After) (research item 6, SC-008, plan p95<300ms cache-miss target) — PARTIAL: badge + OG carry `cache-control` (max-age/s-maxage/stale-while-revalidate); Redis origin cache and rate limiting still pending
- [ ] T061 [P] [US4] Write public API docs (endpoints, fair-use limits, attribution request) in `apps/web/app/(site)/api-docs/page.tsx` (FR-024)
- [ ] T062 [US4] Establish public API versioning discipline: `/api/v1` path stability, a public-API CHANGELOG, and the "breaking change → /api/v2" rule in `apps/web/app/api/CHANGELOG.md` per Principle II (D1)

**Checkpoint**: The utility can spread itself via badges/API/OG; normal traffic stays free and uncapped.

---

## Phase 7: User Story 5 — Honest OSPulse on-ramp (Priority: P3)

**Goal**: A single, non-alarmist OSPulse prompt on package and list pages, framed as whole-tree/continuous/alerting, with nothing gated.

**Independent Test**: On a package page and a list, confirm one honest OSPulse prompt (config-driven visibility) with all data fully present and no gate.

### Tests for User Story 5

- [ ] T063 [P] [US5] E2E test: exactly one non-alarmist OSPulse prompt on package + list pages; no data gated behind it in `apps/web/tests/e2e/on-ramp.spec.ts` (SC-008)

### Implementation for User Story 5

- [X] T064 [US5] Build the config-driven on-ramp (whole-tree/continuous/alerting copy, generosity-preserving) with an OSPulse CTA and a second **PoisonBox** CTA, both from `@observatory/config` (FR-025, config from T009)
- [X] T065 [US5] Place the on-ramp on the package page behind the config visibility slot (FR-025); verified live with both buttons. NOTE: list-page placement still pending

**Checkpoint**: All five stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Openness, framing integrity, accessibility, scale hardening, and end-to-end validation

- [ ] T066 [P] Make the repo public with methodology + data sources documented openly (FR-029) and add attribution/licence notes in `README.md` and `docs/`
- [ ] T067 [P] Accessibility pass (semantic markup, contrast, keyboard nav) across public pages, verified in `apps/web/tests/e2e/a11y.spec.ts`
- [ ] T068 Scale/freshness hardening: verify the `--cadence-dry-run` fits ~10k packages within API budgets and that "last updated" is accurate everywhere (Gate C / SC-004) via `services/pipeline/tests/cadence.test.ts`
- [ ] T069 [P] Verify the fleet/vehicle-telematics exclusion in hand-picked examples and copy (FR-034) via a lint check `scripts/check-examples.ts`
- [ ] T070 [P] No-blame framing guard: review verdict/methodology/on-ramp copy for no name-and-shame language and add a lint/test asserting no blame-framing or maintainer-shaming terms in `scripts/check-framing.ts` (FR-030, G1)
- [ ] T071 [P] Read-only guard: a CI/architecture test asserting no repo-write scopes are requested and no repo-mutation/outreach API calls exist in the codebase in `scripts/check-read-only.ts` (FR-031, G3)
- [ ] T072 Run the full `quickstart.md` validation end to end and record results
- [ ] T073 Run the merge gate: `pnpm lint && pnpm build && pnpm test && pnpm test:fairness && pnpm test:e2e` all green

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
