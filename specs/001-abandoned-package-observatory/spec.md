# Feature Specification: The Observatory — Abandoned-Package Health Observatory

**Feature Branch**: `001-abandoned-package-observatory`

**Created**: 2026-08-22

**Status**: Draft

**Input**: User description: "docs/brainstorm-abandoned-package-observatory.md"

## Overview

A public, free, continuously-updated web utility that measures the maintenance health and abandonment risk of the open-source packages the world depends on. Any developer can look up a single package and get a fair, defensible verdict ("actively maintained" / "stable, low activity" / "slowing down" / "at risk" / "archived") backed by named, sourced signals and an honest methodology. A front page publishes a headline finding about the state of the ecosystem, with shareable leaderboards, per-ecosystem overviews, and search.

Two ranked goals govern every trade-off:

1. **Be a genuinely useful, trustworthy public utility** that people link to, cite, and return to. Usefulness and credibility are the growth strategy; anything that feels like extraction (gated data, alarmist scores, fake urgency) destroys the trust that generates the traffic.
2. **Act as the free, single-package face of the same intelligence sold at depth by OSPulse** (whole-dependency-tree monitoring, alerting, policy). The on-ramp to OSPulse is earned, never a paywall ambush.

The single most important surface is the per-package health page: thousands of fast, fair, richly-marked-up pages that rank for long-tail searches like "is X maintained" / "X alternatives" / "is X dead".

## Clarifications

### Session 2026-08-22

- Q: How is the "most-depended-on" working universe defined? → A: Per-ecosystem, ranked by transitive dependents, with downloads as a tiebreak (≈5k npm + ≈5k PyPI to start).
- Q: What are the concrete Gate D (links/traffic) success targets? → A: Within 6 months post-launch, ≥50 referring domains and ≥60% of per-package pages indexed and ranking page 1 for their "<package> maintained" query.
- Q: Is the health score a transparent rubric or a learned model? → A: Transparent weighted rubric — every signal and weight documented and fully decomposable; no learned or hybrid layer.
- Q: What is the per-package page performance target? → A: Core Web Vitals "good" at the 75th percentile — LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- Q: How granular and long-lived is health history? → A: Snapshot every scoring run and retain full history indefinitely; render trend charts from a daily-downsampled series.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The searcher gets a fair verdict on one package (Priority: P1)

A developer wonders whether a dependency is still maintained. They search the web for "is left-pad maintained" (or use the site's own search) and land on that package's health page. The page gives a clear, plain-language verdict, the signals behind it, a trend showing direction, the key facts (last release, maintainers, bus factor, dependents, licence), and links to the source repo, the registry, and the methodology. They leave with a trustworthy answer they can defend to a colleague.

**Why this priority**: The per-package page is the product and the traffic surface. Without an excellent, fair, discoverable page, nothing else in the project earns links or visits. It is the minimum viable slice that delivers standalone value to the largest audience.

**Independent Test**: Look up any covered package by URL or search; confirm the page shows a verdict, a per-signal decomposition, a trend direction, key facts, a "last updated" timestamp, and links to repo/registry/methodology, and that a package with an unresolvable repo shows "insufficient data" rather than a fabricated score.

**Acceptance Scenarios**:

1. **Given** a covered, actively-maintained package, **When** the searcher opens its health page, **Then** they see a plain-language verdict, the named signals that produced it, a trend direction, key facts, and a link to the methodology.
2. **Given** a small, complete, stable package that has not changed in years but has no unresolved breakage, **When** its page loads, **Then** it is classified as "stable / finished", not "at risk" or "abandoned".
3. **Given** a package whose source repository cannot be resolved or accessed, **When** its page loads, **Then** it shows "insufficient data" with an explanation, and no numeric score is fabricated.
4. **Given** any published score, **When** the searcher inspects it, **Then** every contributing signal is named and traceable to something a skeptic could check against the public repo or registry.
5. **Given** a package page, **When** it is opened from a cold cache, **Then** the primary verdict and facts are visible quickly enough to serve as a fast, shareable reference.

---

### User Story 2 - The browser explores the state of the ecosystem (Priority: P2)

Someone arrives at the front page for the headline finding ("we scanned the most-depended-on packages; here is the share showing abandonment signals"). They read the big number, see it broken down by ecosystem, browse leaderboards (most-depended-on-yet-at-risk, single-maintainer packages the world depends on, recently declining, recently archived, healthiest large projects), open a per-ecosystem overview, and share a list. Each list and ecosystem view is its own linkable URL with its own share card.

**Why this priority**: This is the press-bait and social spread — the surface that earns the first wave of citations and drives searchers toward the per-package pages. It depends on the same underlying data and model as US1 and extends its reach, so it follows P1.

**Independent Test**: Open the front page and confirm the headline finding with an ecosystem breakdown and a visible "as of" date; open each leaderboard and each ecosystem overview at its own stable URL; use search to jump from the front page to any package's health page.

**Acceptance Scenarios**:

1. **Given** the front page, **When** it loads, **Then** it shows the headline finding, an ecosystem breakdown, the most striking findings, and the date the figures are current as of.
2. **Given** a leaderboard, **When** it is opened, **Then** it lists ranked packages with their verdicts, links to each package page, and has its own shareable URL and share card.
3. **Given** the search box, **When** the browser types a package name, **Then** they can navigate to that package's health page.
4. **Given** a per-ecosystem overview, **When** it loads, **Then** it shows that ecosystem's headline stats and lists at its own linkable URL.
5. **Given** the headline finding, **When** the underlying data updates on its cadence, **Then** the figure and its "as of" date update so the claim stays re-quotable.

---

### User Story 3 - The methodology makes the numbers defensible (Priority: P1)

A skeptical developer (or a maintainer whose package was scored) wants to know exactly how the verdict was reached. From any score they reach a methodology page that explains every signal, how the score is computed, the fairness rules (including how "finished and stable" is distinguished from "rotting and at risk"), what the score does and does not mean, the data sources and their limits, and the update cadence. If they dispute a score, the answer is data they can check, not opinion.

**Why this priority**: The methodology is why anyone trusts the numbers enough to cite them, and the fairness distinction is the credibility linchpin. It ships with v1 alongside the per-package pages; a score without a public, honest methodology is not shippable, so it shares P1 with US1.

**Independent Test**: From any package score, follow the link to the methodology and confirm it documents every signal used, the computation, the fairness rules, the meaning and limits of the score, the data sources, and the cadence — with nothing hand-tuned per package.

**Acceptance Scenarios**:

1. **Given** any package score, **When** the reader follows the methodology link, **Then** they reach a page documenting every signal, the computation, and the fairness rules.
2. **Given** the methodology page, **When** it is read, **Then** it states plainly what the score does not mean (e.g. it is maintenance health, not vulnerability scanning) and the limits of the data sources.
3. **Given** two packages with the same verdict, **When** their signal breakdowns are compared, **Then** the same rules produced both, with no per-package editorialising.

---

### User Story 4 - Badges, share cards, and open data spread the utility (Priority: P3)

A maintainer embeds an Observatory badge in their README ("Observatory: actively maintained"), which links back to the package's health page. A journalist or poster shares a package or list and an auto-generated share image displays the verdict and trend. A researcher pulls the underlying data through a free, read-only public interface (with attribution requested) to build on it and cite the source.

**Why this priority**: Badges, share images, and open data are the distribution multipliers that turn usefulness into inbound links and citations (the actual objective). They depend on the pages and data existing first, so they follow the core surfaces.

**Independent Test**: Generate a badge for a covered package and confirm it reflects the current verdict and links back; open a package/list and confirm an auto-generated share image with verdict and trend; retrieve a package's data through the public read-only interface without an account.

**Acceptance Scenarios**:

1. **Given** a covered package, **When** a maintainer embeds its badge, **Then** the badge shows the current verdict and links to the package's health page.
2. **Given** a package or list, **When** it is shared to a social platform, **Then** an auto-generated image shows the verdict/trend for that item.
3. **Given** the public read-only data interface, **When** a researcher requests a covered package, **Then** they receive its data without needing an account, with attribution requested.
4. **Given** heavy or abusive automated use of the badge or data interface, **When** it exceeds fair limits, **Then** the service protects itself (caching / rate limiting) without requiring accounts for normal use.

---

### User Story 5 - The professional finds the honest OSPulse on-ramp (Priority: P3)

A security or platform engineer realises the single-package answer is exactly what they need across their whole dependency tree, continuously, with alerts. On a package page or a list they see a relevant, non-alarmist prompt: "Want this for your whole dependency tree, monitored continuously with alerts? → OSPulse." It reads as the obvious next step for the professional use case, never as unlocking data that should be free.

**Why this priority**: Feeding OSPulse is the second ranked goal, but the on-ramp is a lightweight surface that depends on the public pages existing and must not compromise the "free and generous" trust. It is valuable but not part of the minimum useful public utility, so it is P3.

**Independent Test**: On a per-package page and a list, confirm a single, honest, non-alarmist OSPulse prompt framed as scale + monitoring, with the public single-package value complete on its own and no data withheld to drive the click.

**Acceptance Scenarios**:

1. **Given** a per-package page, **When** it loads, **Then** all package data is fully available for free and the OSPulse prompt is present as an optional next step, not a gate.
2. **Given** the on-ramp prompt, **When** it is read, **Then** it describes whole-tree, continuous, alerting use, and never implies the public data is crippled or withheld.

---

### Edge Cases

- **Package with no declared or resolvable repository**: shows "insufficient data", no fabricated score; still a valid, indexed page.
- **Monorepo / multiple packages sharing one repository**: repo-level activity attributed fairly so each package's verdict reflects its own maintenance, not sibling activity.
- **Renamed, moved, deprecated, or successor-superseded package**: page reflects the deprecation/redirect honestly and points to the current status.
- **Archived-but-still-widely-depended-on package**: classified as archived while still surfaced on the "still widely used" list.
- **Finished/perfect small utility vs rotting package**: the fairness rules must separate these; unanswered security issues, dependent-facing breakage, and neglected open PRs weigh over raw commit silence.
- **A maintainer disputes a score**: the per-signal decomposition and methodology account for the verdict with checkable data.
- **A data source is temporarily unavailable or rate-limited**: the last known values are shown with an honest, older "last updated" timestamp rather than a blank or a guess.
- **Sudden maintainer departure** (a formerly-active sole maintainer goes quiet): detected as a declining trend rather than waiting for a fixed staleness threshold.
- **Package present in a registry but absent from the working universe**: reachable via search/URL with whatever data is available, clearly marked as outside the headline-finding set.

## Requirements *(mandatory)*

### Functional Requirements

**Data ingestion and universe**

- **FR-001**: The system MUST ingest package metadata from the major package registries — npm and PyPI in the initial build, with a pluggable path to add crates, Maven, NuGet, RubyGems, Go, and Packagist — including versions, release dates, download counts, declared repository, declared licence, and dependents.
- **FR-002**: The system MUST resolve each package to its source repository and ingest repository activity, including commits, releases/tags, issues (opened/closed and response latency), pull requests (opened/merged and response latency, open-PR backlog), and contributors over time.
- **FR-003**: The system MUST define and maintain a transparent, reproducible "most-depended-on" working universe, ranked **per ecosystem by transitive dependents with download count as the tiebreak** (starting at roughly 5,000 npm + 5,000 PyPI packages, designed to scale up), over which headline findings are computed, and MUST document how membership is determined and hold it stable enough over time to support trend claims.
- **FR-004**: The system MUST respect the terms of service and rate limits of every data source (caching, backoff, attribution, no terms breaches) so that access is not degraded or revoked.

**Health / abandonment model**

- **FR-005**: The system MUST compute a per-package health/abandonment result using a **transparent, weighted rubric** (no learned or hybrid model) over multiple documented signals, including at least: time since last release; release-cadence trend; commit-activity trend; issue-response latency and its trend; PR merge latency and open-PR backlog growth; bus factor / contributor concentration; maintainer-departure signals; archived/deprecated flags; and explicit "looking for maintainer" / hand-off signals. Every signal and its weight MUST be documented.
- **FR-006**: Every published score MUST decompose into its named, individually-sourced signals such that a skeptical reader can check each against the public repository or registry.
- **FR-007**: The system MUST express confidence and MUST return "insufficient data" — never a fabricated or low score — for packages whose repository is private, unresolvable, or otherwise not analysable.
- **FR-008**: The model MUST distinguish "finished and stable" (small/complete/correctly-unchanging, or large/mature/slow-moving) from "rotting and at risk", weighting unanswered security issues, dependent-facing breakage, and neglected open PRs over raw commit silence, so that a complete, healthy package is never branded abandoned.
- **FR-009**: Scores MUST be computed and reproducible with no per-package hand-tuning or manual curation; the same rules MUST produce every verdict.
- **FR-010**: Each package MUST carry a plain-language verdict drawn from a fixed, documented set (for example: actively maintained / stable, low activity / slowing down / at risk / archived / insufficient data).
- **FR-011**: The system MUST maintain per-package health history by **snapshotting the score on every scoring run and retaining the full history indefinitely**, so each score has a direction (improving / stable / declining) and the site can show health over time and detect the onset of decline. Trend charts MUST render from a **daily-downsampled** series to keep pages light without discarding stored data.

**Freshness**

- **FR-012**: The system MUST re-run ingestion and scoring on a defined cadence that can differ per data source (cheaper registry metadata more often, heavier repository analysis less often) so the data is continuously updated rather than a one-off snapshot.
- **FR-013**: The system MUST display an honest "last updated" indication on every surface that shows a score or finding, and MUST NOT present stale data as if it were live.

**Public site — per-package pages (primary surface)**

- **FR-014**: The system MUST publish one clean, fast, public health page per package showing the verdict, the signal breakdown, the trend chart, key facts (last release, maintainers, bus factor, dependents, licence), and links to the source repository, the registry, and the methodology.
- **FR-015**: Per-package pages MUST use clean, stable, human-readable URLs namespaced by ecosystem (for example `/npm/lodash`, `/pypi/requests`).
- **FR-016**: Per-package pages MUST be optimised for search discovery as a first-class requirement: server-rendered or statically served content, complete page metadata and social share cards, appropriate structured data markup, inclusion in XML sitemaps covering the whole universe, load performance meeting Core Web Vitals "good" at p75 (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1), and internal linking between related packages.

**Public site — discovery surfaces**

- **FR-017**: The system MUST publish a front page showing a continuously-updated headline finding (the shareable "X% of the most-depended-on packages show abandonment signals" figure), broken down by ecosystem, with the most striking findings surfaced and an "as of" date.
- **FR-018**: The system MUST publish leaderboards/lists, each at its own stable URL with its own share card, including at least: most-depended-on-yet-at-risk; single-maintainer packages the world depends on; recently declining; recently archived but still widely used; and healthiest large projects.
- **FR-019**: The system MUST provide fast search that takes any package name to its health page.
- **FR-020**: The system MUST publish per-ecosystem overview pages (e.g. npm health, PyPI health), each a linkable, rankable landing page with that ecosystem's headline stats and lists.
- **FR-021**: The system MUST publish a methodology page (shipping with v1) that documents every signal, the computation, the fairness rules, what the score does and does not mean, the data sources and their limits, and the update cadence; every score MUST link to it.

**Distribution and open data**

- **FR-022**: The system MUST provide an embeddable per-package badge that reflects the current verdict and links back to the package's health page.
- **FR-023**: The system MUST auto-generate shareable social/preview images per package and per list showing the verdict and trend.
- **FR-024**: The system MUST provide a free, read-only public data interface / export of the underlying data (with attribution requested) usable without an account, and MUST protect it and the badge from abuse and runaway cost via caching and rate limiting without requiring accounts for normal use.

**OSPulse on-ramp**

- **FR-025**: On per-package pages and lists, the system MUST present a single, honest, non-alarmist prompt toward OSPulse, framed as whole-dependency-tree, continuous, alerting use, with all public single-package data fully available for free and nothing withheld to drive the click.
- **FR-026**: The health/abandonment model MUST be architected as a shared engine that both the Observatory (public, single-package, periodic) and OSPulse (private, whole-tree, continuous, alerting) can consume, so improvements to the model serve both and the public tool stays a faithful representation of the paid one.

**Placement, livery, and openness**

- **FR-027**: The system MUST be a self-contained, mountable property with a configurable base URL and branding slots, so it can be deployed standalone under the Fortitude corporate domain or as a section within the OSPulse site without a rewrite; neither host may be hard-wired.
- **FR-028**: The system MUST match the Fortitude / OSPulse house style so it reads as an official Fortitude property wherever it is mounted.
- **FR-029**: The methodology and data sources MUST be documented openly, and the project MUST be public from day one.

**Honesty and fairness guarantees**

- **FR-030**: The system MUST NOT name-and-shame individual maintainers or frame abandonment as a moral failing; all copy and scoring MUST use no-blame framing.
- **FR-031**: The system MUST be read-only observation only: no automated maintainer outreach, no "claim your package" flows, and no writing to repositories.
- **FR-032**: Scores MUST reflect only real, sourced, reproducible signals; the system MUST NOT inflate risk for drama, issue alarmist verdicts to drive OSPulse clicks, or present "insufficient data" as a low score.
- **FR-033**: The system MUST validate the model against a hand-labelled set of packages with known status (genuinely abandoned; actively maintained; and, critically, finished/stable-but-not-abandoned), and MUST achieve high precision specifically on the "finished but healthy" class before any score is published.
- **FR-034**: Hand-picked examples and copy MUST exclude fleet/vehicle telematics packages.

### Key Entities *(include if feature involves data)*

- **Ecosystem**: A package registry universe (npm, PyPI, …) with its own overview page, headline stats, and namespaced URLs; the unit the initial build scopes to npm and PyPI.
- **Package**: A single library within an ecosystem, with identity, declared repository, declared licence, versions/release dates, download counts, and dependents; the subject of a health page and a URL.
- **Source Repository**: The resolved code host record for a package, carrying commit/release/issue/PR/contributor activity; may be unresolvable (→ insufficient data) or shared by several packages (monorepo).
- **Signal**: A single named, sourced input to the model (e.g. time-since-last-release, PR-merge latency, bus factor), each documented and independently checkable.
- **Health Score / Verdict**: The computed, decomposable result for a package at a point in time — a plain-language verdict from a fixed set, its contributing signals, and a confidence indication.
- **Health History**: The time series of a package's scores — one snapshot per scoring run, retained in full indefinitely, and daily-downsampled for charting — giving trend direction and enabling "health over time" and decline detection.
- **Working Universe**: The transparent, reproducible "most-depended-on" set over which headline findings are computed, with documented membership rules.
- **Leaderboard / List**: A named, ranked, shareable collection of packages (at-risk, single-maintainer, declining, archived-but-used, healthiest), each its own URL and share card.
- **Badge**: An embeddable per-package status artifact reflecting the current verdict and linking back to the health page.
- **Methodology**: The authoritative public documentation of signals, computation, fairness rules, meaning/limits, data sources, and cadence that every score links to.
- **Validation Set**: The hand-labelled reference packages (abandoned / actively maintained / finished-but-healthy) used to verify fairness before publishing scores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (Fairness — the one that matters most): On the hand-labelled validation set, the model correctly separates "at risk" from "stable/finished", achieving at least 95% precision on the "finished but healthy" class specifically, so that complete, stable packages are not branded dead. This gate MUST pass before any score is published.
- **SC-002** (Defensibility): 100% of published scores decompose into named signals that a reader can trace to the public repository or registry, and every score links to the methodology; no published score exists that cannot be accounted for from its signals.
- **SC-003** (Honesty of coverage): 100% of packages with an unresolvable or private repository are shown as "insufficient data" with no fabricated numeric score.
- **SC-004** (Freshness & scale): The pipeline sustains the working universe (starting at ~10,000 packages) on its defined cadence within data-source rate limits, and every score/finding surface shows an accurate "last updated" indication; no surface presents data older than its stated cadence as current.
- **SC-005** (Coverage at launch): The initial build covers npm and PyPI across the top ~10,000 most-depended-on packages, each with its own indexed, sitemapped health page.
- **SC-006** (Discovery / links — the actual objective): Within **6 months** of launch, the site earns **at least 50 referring domains**, and **at least 60%** of per-package pages are indexed and ranking on the first page of results for their "<package> maintained" style query.
- **SC-007** (Speed): Per-package pages meet Core Web Vitals "good" thresholds at the 75th percentile — **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1** — so the verdict and key facts serve as a fast, shareable quick-reference and satisfy the ranking-relevant performance bar.
- **SC-008** (Trust / generosity): No public single-package data is gated, and the OSPulse prompt appears at most once per page as an optional next step; the public value is complete without it.
- **SC-009** (Re-quotability): The headline finding updates on its cadence and always carries an accurate "as of" date, so citations can be pinned to a point in time.

## Assumptions

The brainstorm's "Open questions for the spec session" are recorded here as the reasonable defaults chosen for this spec; `/speckit-clarify` is the place to confirm or change them before planning.

- **Score model** (confirmed, Session 2026-08-22): A transparent, weighted, fully-explainable rubric — no learned or hybrid model — because defensibility (per-signal decomposition, Gate B) is the core value.
- **"Most-depended-on" definition** (confirmed, Session 2026-08-22): Membership of the working universe is defined per ecosystem by transitive dependents, with download count as the tiebreak, starting at ≈5k npm + ≈5k PyPI and held stable enough over time to support trend claims. The exact definition is documented in the methodology.
- **"Finished ≠ abandoned" signals**: The distinction is assumed to lean on unanswered security issues, dependent-facing breakage reports, neglected open PRs, and semver stagnation with open bugs, rather than raw commit silence. The validation set is hand-labelled across abandoned / actively-maintained / finished-but-healthy classes.
- **Repo-host API budget**: The universe starts at ~10,000 packages with a mixed refresh cadence and aggressive caching/backoff to stay within host rate limits; universe size scales only as the budget allows.
- **Update cadence**: Registry metadata refreshes frequently; deep repository analysis refreshes less frequently; the exact cadences are documented and shown via "last updated".
- **Badge & API abuse control**: Achieved through caching and rate limiting without requiring accounts for normal use.
- **Rendering approach**: Per-package pages are served statically or server-rendered-and-cached; the specific rendering strategy is an implementation decision for planning, constrained by the SEO and performance requirements here, not fixed by this spec.
- **On-ramp placement**: A single, subtle, non-alarmist OSPulse prompt per page; exact wording and placement tuned during design, held to the generosity guarantee.
- **Placement (standalone vs within OSPulse)**: Deferred by design; the build is placement-agnostic (FR-027) so the decision is a deployment choice made before launch, not before build.
- **Out of scope for this spec** (belongs to OSPulse or other tools): user accounts, monitoring, alerting, saved packages, and dependency-tree upload/analysis; vulnerability/CVE scanning, reachability, and SBOMs; any paid tier, gating, or login on the Observatory itself; automated maintainer outreach or repository writes; and ecosystems beyond npm and PyPI in the initial build (the pipeline is pluggable and the rest follow).
