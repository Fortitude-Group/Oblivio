# Phase 1 Data Model: The Observatory

**Feature**: 001-abandoned-package-observatory | **Date**: 2026-08-22

Derived from the spec's Key Entities and Functional Requirements. Types are conceptual (storage is PostgreSQL via Drizzle); field notes call out identity, validation, and lifecycle. All timestamps are UTC. Nondeterministic values (fetch/run timestamps, ingest run ids) are recorded but excluded from score computation (Principle IV).

## Entities

### Ecosystem
Registry universe the utility covers.
- `id` (enum/string PK): `npm`, `pypi` (extensible: `crates`, `maven`, `nuget`, `rubygems`, `go`, `packagist`).
- `display_name`, `homepage_url`.
- `enabled` (bool): whether ingested in the current build (npm, pypi = true at launch).
- **Relationships**: has many Packages.

### Package
A single library within an ecosystem — subject of a health page and URL.
- `id` (PK).
- `ecosystem_id` (FK) + `name` → **unique together** (identity). Drives the URL `/{ecosystem}/{name}`.
- `declared_repo_url`, `resolved_repo_id` (FK → Repository, nullable when unresolvable).
- `declared_license`, `latest_version`, `latest_release_at`.
- `download_count` (period-normalised), `direct_dependents_count`, `transitive_dependents_count`.
- `is_deprecated`, `is_archived` (mirrored from registry/repo flags — hard verdict overrides).
- `in_universe` (bool) + `universe_rank` (int, nullable) — membership in the current working universe (FR-003).
- `last_ingested_at`.
- **Validation**: `name` matches the ecosystem's package-name grammar; URL fields validated at ingestion boundary (Zod).
- **State**: `resolved` ↔ `unresolvable` (no accessible repo → scores as *insufficient data*, never a number, FR-007).
- **Relationships**: belongs to Ecosystem; may resolve to one Repository (many packages → one Repository for monorepos); has one current Score; has many Score Snapshots; has many outgoing/incoming Dependency edges.

### Repository
Resolved source-host record carrying activity signals.
- `id` (PK), `host` (`github`|`gitlab`), `owner`, `name` → **unique together**.
- `is_archived`, `default_branch`, `created_at`, `pushed_at`.
- Activity aggregates (refreshed on repo cadence): `last_commit_at`, `commit_activity_trend`, `open_issues`, `median_issue_response_hours`, `issue_response_trend`, `open_prs`, `median_pr_merge_hours`, `open_pr_backlog_trend`, `contributor_count`, `bus_factor`, `top_contributor_share`, `last_active_maintainer_at`, `looking_for_maintainer` (bool).
- `etag` / `last_conditional_fetch_at` (conditional-request caching, research item 2).
- `access_state` (`ok`|`rate_limited`|`private`|`not_found`|`error`) with `last_error_at` — drives the "last known values with older timestamp" fallback (edge case).
- **Relationships**: has many Packages (monorepo-aware attribution); has one Contributor-history series.

### DependencyEdge
Edge in the per-ecosystem dependency graph (basis for transitive dependents, FR-003).
- `ecosystem_id`, `from_package_id`, `to_package_id`, `edge_kind` (`runtime`|`dev`|`optional`).
- **Identity**: unique (`from_package_id`, `to_package_id`, `edge_kind`).
- Used to compute `transitive_dependents_count` and the ranked universe per run.

### Signal (definition) — code-canonical, not a DB table
Static catalogue of the rubric's inputs. The **single source of truth is the scoring-engine code**: each signal exports `{ key, display_name, description, weight, direction }` as a module constant (`packages/scoring-engine`). The methodology page is generated from these exported constants so it cannot drift, and `ScoreSnapshot.signal_breakdown` references the same keys. No separate database table (removed to avoid two sources of truth, F1).
- `key` (e.g. `time_since_release`, `pr_merge_latency`, `bus_factor`), `display_name`, `description`, `weight` (global constant), `direction` (higher = healthier / riskier).
- **Rule**: weights are global module constants; no per-package values (FR-009).

### ScoreSnapshot (append-only history)
One row per package per scoring run — the raw history (FR-011, "snapshot every run, retain indefinitely").
- `id` (PK), `package_id` (FK), `computed_at`, `ingest_run_id`.
- `verdict` (enum, below), `overall_score` (nullable when insufficient data), `confidence` (`high`|`medium`|`insufficient_data`).
- `signal_breakdown` (JSON: array of `{ key, raw_value, sub_score, weight, source_ref }`) — every published number decomposes here (Gate B / Principle XII).
- `trend_direction` (`improving`|`stable`|`declining`) computed vs prior snapshots.
- **Partitioning**: by `computed_at` month. **Deletion guard**: append-only, protected from destructive migration (Principle X).
- **Relationships**: belongs to Package; the latest snapshot per package is surfaced as the current Score.

### ScoreDaily (downsampled rollup)
Daily-downsampled series for charts (FR-011) — keeps pages light without discarding history.
- `package_id`, `day` (date) → unique together; `overall_score`, `verdict`. Rebuilt by the daily rollup job.

### WorkingUniverse (snapshot)
Reproducible record of the ranked universe per run (denominator for the headline finding).
- `id` (PK), `built_at`, `ingest_run_id`, `ecosystem_id`, `criteria_version`.
- `members` (ordered package_ids with rank) — persisted so headline/trend claims are auditable and stable.

### Leaderboard (definition)
Named, shareable list config (FR-018).
- `slug` (PK, e.g. `most-depended-on-at-risk`, `single-maintainer`, `recently-declining`, `recently-archived-still-used`, `healthiest-large`), `title`, `description`, `query_definition`, `inclusion_note` (what the list includes/excludes — Principle XII).

### Badge (derived)
Not stored as rows; computed from the current Score for `/{ecosystem}/{name}` — `verdict`, `label`, `link_back_url`. Cached (research item 6).

### Methodology (generated, not a DB table)
The methodology page (FR-021) is **generated from the scoring-engine's exported signal constants + rubric weights + fairness rules**, plus static prose, and versioned through the scoring-engine CHANGELOG and git (F2 — no separate `MethodologyDoc` table). This guarantees it always matches the live model.

### ValidationLabel
- Hand-labelled fixture — `package_ref`, `label` (`abandoned`|`active`|`finished_healthy`), `rationale`, `source_snapshot_at`. Drives the blocking fairness gate (SC-001). Lives as fixtures + an optional table for querying; not on the public read path.

## Verdict enumeration (FR-010)
`actively_maintained` · `stable_low_activity` · `slowing_down` · `at_risk` · `archived` · `insufficient_data`
- `archived` and `insufficient_data` are hard overrides (set before rubric weighting); the rest map from the weighted total.

## Key relationships (summary)
- Ecosystem 1—* Package *—1 Repository (Repository 1—* Package for monorepos).
- Package 1—* ScoreSnapshot (append-only) → latest = current Score; Package 1—* ScoreDaily.
- Package *—* Package via DependencyEdge → feeds `transitive_dependents_count` → WorkingUniverse ranking.
- Signal catalogue is referenced by every ScoreSnapshot's `signal_breakdown`.

## Validation & integrity rules
- A Package with `resolved_repo_id = NULL` or Repository `access_state ∈ {private, not_found}` MUST produce `insufficient_data`, never a numeric score (FR-007, FR-032).
- Monorepo attribution: repo-level activity is attributed per package so a package's verdict reflects its own maintenance, not a sibling's (edge case).
- `in_universe` and `universe_rank` are only set from a persisted WorkingUniverse snapshot (reproducibility).
- Every rendered figure traces to a `signal_breakdown` entry or a persisted aggregate (Principle XII); no figure is displayed that cannot be sourced.
- Downsampling (ScoreDaily) never deletes ScoreSnapshot rows.
