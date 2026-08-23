# Implementation Plan: The Observatory — Abandoned-Package Health Observatory

**Branch**: `001-abandoned-package-observatory` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-abandoned-package-observatory/spec.md`

## Summary

The Observatory is a public, free, continuously-updated web utility that scores the maintenance health of the most-depended-on open-source packages (npm + PyPI first) and publishes a fast, fair, richly-marked-up health page per package plus a headline state-of-the-ecosystem finding, leaderboards, ecosystem overviews, search, badges, share images, and a read-only public data API. The technical approach is a **TypeScript monorepo**: a shared, deterministic **transparent-rubric scoring engine** consumed both by the Observatory's ingestion pipeline and (behind a versioned interface) by OSPulse; a **Postgres** store holding the package/repo graph, current scores, and an append-only score history; a **Redis-backed job pipeline** running a mixed refresh cadence within data-source rate limits; and a **Next.js (App Router) site using on-demand ISR** so tens of thousands of SEO pages regenerate only when a package's score changes, holding Core Web Vitals "good" without full-site rebuilds. Placement is a deployment choice (configurable base URL + branding slots), never hard-wired.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (single language across pipeline, engine, and site for one shared model implementation per Constitution Principle I).

**Primary Dependencies**: Next.js 15 (App Router, on-demand ISR) for the public site + route handlers (API, badges, OG); React 19; Postgres client + Drizzle ORM for schema/migrations/data access; BullMQ on Redis for the job queue/scheduler; Satori / `@vercel/og` for OG and badge SVG/PNG generation; Octokit (GitHub GraphQL + REST via a GitHub App) and a GitLab REST client for repo activity; registry clients for npm (registry + downloads API) and PyPI (JSON API + PyPI dependency metadata). Zod for boundary validation.

**Storage**: PostgreSQL 16 (primary store — packages, repos, dependents edges, current scores, append-only `score_snapshots` history, and a `score_daily` downsampled rollup for charts; table partitioning on the history table). Redis 7 (job queue, response/badge cache, rate-limit token buckets). Object/CDN cache for generated OG images.

**Testing**: Vitest (unit + integration for the scoring engine, ingestion adapters, and data access); a dedicated **fairness validation harness** running the hand-labelled set (Gate A) as a blocking test; Playwright (E2E for public pages, search, badges, and API) with Lighthouse/CWV assertions on per-package pages; contract tests for the public read-only API and the scoring-engine interface.

**Target Platform**: Linux server (containerised Node runtime) behind a CDN for the public site and API; the pipeline runs as scheduled worker processes against Postgres + Redis. Deployable standalone under the Fortitude corporate domain or mounted as a section of the OSPulse site.

**Project Type**: Web application + background data pipeline (monorepo: shared packages + `apps/web` + `services/pipeline`).

**Performance Goals**: Per-package pages meet Core Web Vitals "good" at p75 (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, per SC-007). Public API and badge responses are **edge-cache-bound** (an edge-cache hit is the served path for the overwhelming majority of traffic); the origin target is **p95 < 300ms on a cache miss** for a single-package API or badge response. Pipeline sustains the ~10k-package universe (≈5k npm + 5k PyPI) on its refresh cadence within GitHub/GitLab and registry rate limits (Gate C).

**Constraints**: Every published score is deterministic given its snapshotted inputs (Principle IV) and fully decomposes into named signals (Gate B / Principle XII). Read-only observation only — no writes to repos, no accounts. Data-source ToS and rate limits respected (caching, conditional requests, backoff, attribution). Public single-package data is never gated (SC-008). "Insufficient data" is never rendered as a low score (FR-007/FR-032).

**Scale/Scope**: Launch universe ≈10k packages, each an indexed, sitemapped page; architecture designed to scale toward ~100k pages across additional ecosystems without a rendering-strategy rewrite. Append-only history retained indefinitely, daily-downsampled for charts (FR-011).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Evaluated against `.specify/memory/constitution.md` (v1.5.0).

| Principle | How this plan satisfies it | Status |
|-----------|---------------------------|--------|
| **I. Modular & Composable** | Scoring engine, ingestion adapters, and data access are self-contained workspace packages behind explicit interfaces; `apps/web` and `services/pipeline` are thin consumers. Ingestion is pluggable per ecosystem (FR-001). | PASS |
| **II. Contract Stability & SemVer** | Two published contracts — the read-only public API and the scoring-engine interface — are versioned (SemVer) with documented shapes in `contracts/`; consumers pin versions. | PASS |
| **III. Comprehensive Tests for Public Contracts** | API contract tests, scoring-engine unit tests, and the blocking fairness validation harness (Gate A) all merge-gate; edge cases (insufficient data, monorepo, rate-limit fallback) covered. | PASS |
| **IV. Deterministic & Observable** | Rubric produces the same score from the same snapshotted inputs; nondeterminism (fetch timestamps, ingest run ids) is isolated and recorded, not baked into scores. Pipeline emits structured logs/metrics traceable per package per run. | PASS |
| **V. Simplicity & Justified Complexity** | Single language, one primary DB + Redis, one web framework. The multi-package monorepo is the *minimum* structure that satisfies the explicit shared-engine requirement (FR-026) and pluggable ingestion (FR-001); a single flat app would force the model to be copied into OSPulse, violating Principle I. No microservice sprawl. | PASS |
| **VI. Complete the Scope** | Methodology page, fairness gate, badges, OG images, and public API all ship in v1 per the spec; nothing in-scope deferred. | PASS |
| **X. Production Changes Wait for a Human** | Deploys and schema migrations go through the project's deploy path with per-change owner approval; the append-only history table carries a deletion guard. Dev/preview environments stay freely automatable. | PASS |
| **XI. Establish the Mechanism Before Changing Code** | The fairness gate validates the rubric against the *real* labelled data before any score publishes; universe/denominator definitions are checked against actual registry data, not assumed. | PASS |
| **XII. Explain Every Number** | Every score decomposes into named signals with a plain-language verdict; "last updated" shown everywhere; filtered counts (leaderboards, headline finding) state what they include/exclude; the methodology page accounts for every figure. | PASS |

**Result (pre-Phase 0)**: No violations. Complexity Tracking table not required.

**Re-check (post-Phase 1 design)**: The data model (append-only `ScoreSnapshot` with deletion guard, decomposable `signal_breakdown`), the contracts (versioned public API + versioned shared scoring-engine interface + fairness guarantees), and the deterministic pure-function engine all reinforce Principles I, II, III, IV, X, XI, and XII. No new complexity introduced; **still PASS**, no Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/001-abandoned-package-observatory/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — resolved technical decisions
├── data-model.md        # Phase 1 output — entities, fields, relationships, history model
├── quickstart.md        # Phase 1 output — runnable validation scenarios
├── contracts/           # Phase 1 output — public API + badge/OG + scoring-engine contracts
│   ├── public-api.md
│   ├── badge-and-og.md
│   └── scoring-engine.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify + /speckit-clarify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

A pnpm-workspace + Turborepo monorepo. Shared logic lives in `packages/`; the two runtimes (`apps/web`, `services/pipeline`) are thin consumers.

```text
packages/
├── core/                     # Shared domain types, verdict enum, ecosystem/config contracts
├── config/                   # Base-URL + branding slots (placement-agnostic mounting)
├── scoring-engine/           # Transparent weighted rubric — the shared model (FR-005/026)
│   ├── src/signals/          # One module per signal, each documented + independently tested
│   ├── src/rubric.ts         # Weighted combination + verdict mapping + confidence
│   └── src/validation/       # Fairness validation-set runner (Gate A)
├── ingestion/                # Pluggable per-ecosystem + per-repo-host adapters (FR-001/002)
│   ├── src/registries/       # npm, pypi (interface + adapters)
│   ├── src/repos/            # github, gitlab (interface + adapters)
│   └── src/universe/         # "most-depended-on" selection: transitive dependents (FR-003)
└── db/                       # Drizzle schema, migrations, data-access repositories

apps/
└── web/                      # Next.js App Router — the public site + API + badges + OG
    ├── app/(site)/[ecosystem]/[package]/   # Per-package health page (ISR) — primary surface
    ├── app/(site)/[ecosystem]/             # Ecosystem overview
    ├── app/(site)/lists/[slug]/            # Leaderboards
    ├── app/(site)/methodology/             # Methodology page
    ├── app/(site)/page.tsx                 # Front page (headline finding)
    ├── app/api/v1/                         # Read-only public API (contract-tested)
    ├── app/badge/[ecosystem]/[package]/    # Embeddable badge
    ├── app/og/                             # OG image generation
    ├── app/sitemap/                        # Chunked XML sitemaps over the universe
    └── tests/                              # Playwright E2E + CWV assertions

services/
└── pipeline/                 # BullMQ workers + scheduler (mixed refresh cadence, FR-012)
    ├── src/jobs/             # ingest-registry, refresh-repo, score, rollup-daily
    └── src/schedule/         # per-source cadence config

tests/                        # Cross-cutting integration + fairness harness fixtures
└── fixtures/validation-set/  # Hand-labelled packages (abandoned / active / finished-healthy)
```

**Structure Decision**: Monorepo with a shared `scoring-engine` package is chosen because FR-026 requires one model consumed by both the Observatory and OSPulse, and Principle I forbids copying that logic into a second consumer. Ingestion is split into registry and repo-host adapter packages so new ecosystems (crates, Maven, …) plug in without touching the engine or the site. The Next.js app carries the site, the public API, badges, and OG generation together because they share the same data-access layer and rendering/cache infrastructure; the pipeline is a separate runtime because it has a different lifecycle (scheduled workers, not request-driven).

## Complexity Tracking

> No Constitution Check violations. Table intentionally empty.
