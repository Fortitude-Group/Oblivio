# Phase 0 Research: The Observatory

**Feature**: 001-abandoned-package-observatory | **Date**: 2026-08-22

This resolves the technical decisions the spec left to planning (the "deferred, low-impact" assumptions in the spec, plus the concrete stack choices in the plan's Technical Context). Each item follows Decision / Rationale / Alternatives considered. There are no remaining NEEDS CLARIFICATION items.

## 1. Rendering strategy for tens of thousands of SEO pages

- **Decision**: Next.js App Router with **on-demand ISR** (Incremental Static Regeneration). Per-package pages are statically generated and cached; when a package's score changes, the pipeline calls a revalidation hook to regenerate just that page. Sitemaps are chunked (≤50k URLs per file) and generated on a schedule.
- **Rationale**: Delivers static-quality HTML and Core Web Vitals "good" (SC-007) while avoiding a full-site rebuild for every data refresh — the fatal cost of pure static export at 10k→100k pages that update continuously. Regeneration is proportional to *changed* packages, which is what the pipeline already knows. Server-rendered HTML satisfies the SEO requirement (FR-016) without shipping heavy client JS.
- **Alternatives considered**: (a) **Full static export** — best raw performance, but rebuild time and cost grow linearly with the universe and every refresh triggers a full rebuild; fails at scale. (b) **Pure SSR + CDN cache** — no build step, but a cache miss renders on the request path (worse tail latency and CWV) and couples page freshness to cache TTL rather than to real score changes.

## 2. Repo-host API budget (Gate C)

- **Decision**: Access GitHub via a **GitHub App** (per-installation token, GraphQL-first for activity queries), GitLab via a project/group token (REST). Use **conditional requests (ETag/If-None-Match)** and cache aggressively; a **priority queue** refreshes hot/declining packages more often than stable ones; exponential backoff + jitter on secondary-rate-limit signals. Start the universe at ≈10k and scale only as measured headroom allows.
- **Rationale**: A GitHub App raises the rate ceiling above a single PAT and GraphQL fetches commits/releases/issues/PRs/contributors in one round trip per repo, which is the difference between fitting 10k repos in the cadence window and not. Conditional requests make unchanged repos nearly free. This keeps the pipeline a good API citizen (FR-004) and avoids the block-by-GitHub failure mode.
- **Alternatives considered**: Single PAT (too low a ceiling); REST-only (many more calls per repo); scraping (ToS breach — rejected outright).

## 3. Update cadence per data source (FR-012)

- **Decision**: A mixed cadence, all surfaced via "last updated":
  - Registry package metadata (versions, releases, deprecation, declared repo/licence): **daily**.
  - Download statistics: **weekly**.
  - Deep repo activity (commits/issues/PRs/contributors): **weekly** for the universe by default, promoted to more frequent for packages flagged declining or recently changed (priority queue).
  - Score computation + history snapshot: on **every** completed refresh of a package's inputs.
  - Daily downsample rollup for charts: **daily**.
- **Rationale**: Cheap registry reads stay fresh; expensive repo analysis runs at a sustainable rate within the API budget (item 2). Snapshotting on every input refresh gives the trend its raw material (FR-011) while the daily rollup keeps charts and page weight light.
- **Alternatives considered**: Uniform daily deep-repo refresh (breaks the API budget at 10k+); on-access lazy refresh (unpredictable freshness, poor for a "last updated" trust signal).

## 4. "Most-depended-on" universe construction (FR-003, confirmed in Clarifications)

- **Decision**: Build a per-ecosystem dependency graph from registry dependency metadata, compute **transitive dependents** per package, rank by that count with **download count as tiebreak**, and take the top ≈5k npm + ≈5k PyPI. Persist the ranked universe with the run that produced it so membership is reproducible and stable enough for trend claims.
- **Rationale**: Matches the confirmed clarification and the "packages the world depends on" framing; transitive dependents resist download gaming and capture deep-tree criticality. Snapshotting the universe per run makes the headline finding's denominator auditable (Gate B, Principle XII).
- **Alternatives considered**: Direct dependents only (understates deep criticality); downloads only (noisy/gameable); a global cross-ecosystem list (incomparable counts). All rejected during `/speckit-clarify`.
- **Open data note**: npm dependency edges come from the registry; PyPI dependency edges from package metadata (requires-dist). Where a third-party aggregated dependents dataset is used to bootstrap, its licence and attribution are honoured and recorded in the methodology.

## 5. Scoring model (FR-005, confirmed in Clarifications)

- **Decision**: A **transparent weighted rubric**. Each signal is a pure function of snapshotted inputs producing a normalised sub-score with a documented weight; the verdict is a documented mapping over the weighted total plus hard overrides (archived/deprecated flags, "insufficient data" when the repo is unresolvable). No learned or hybrid component.
- **Rationale**: Defensibility is the product (Gate B). A rubric decomposes by construction, is explainable on the methodology page, is deterministic (Principle IV), and can be defended in a GitHub issue with data. Weights are global constants, never per-package (FR-009).
- **Fairness ("finished ≠ abandoned", Gate A)**: The rubric weights *dependent-facing harm* — unanswered security issues, dependent-breakage reports, neglected open PRs, semver stagnation with open bugs — above raw commit silence, so a small complete package or a large mature slow-mover is not penalised for not changing. Validated by the blocking fairness harness (see item 7).
- **Alternatives considered**: Learned model (better separation, weaker defensibility); hybrid (reintroduces the undefendable-number risk). Both rejected in `/speckit-clarify`.

## 6. Badge + public API abuse / cost control (FR-024)

- **Decision**: No accounts. Badges and API responses are **cached at the CDN edge** (short TTL for badges so they track the current verdict, longer for immutable historical data) and behind an origin cache in Redis. Apply **per-IP token-bucket rate limiting** in Redis on the API and badge origins; return cache-friendly headers so most traffic never reaches origin. Publish fair-use limits in the API docs; request attribution.
- **Rationale**: A public badge and open API are the distribution multipliers (Gate D) but also the abuse surface; edge caching turns a viral README badge into near-zero marginal origin load, and token buckets cap the tail without forcing logins (which would break the "give it away" principle, SC-008).
- **Alternatives considered**: API keys/accounts (violates the free-and-open constraint); no rate limiting (cost/abuse risk); signed badge URLs (needless friction for maintainers embedding them).

## 7. Fairness validation harness (Gate A, SC-001)

- **Decision**: A hand-labelled fixture set in `tests/fixtures/validation-set/` with three classes — genuinely abandoned, actively maintained, and **finished/stable-but-healthy** (small perfect utilities + large mature slow-movers). A blocking test runs the rubric over the set and asserts **≥95% precision on the finished-but-healthy class** before any score can publish. Labels carry a rationale and a source snapshot so the set is auditable and reproducible.
- **Rationale**: This is the single most important credibility gate; one screenshot of a stable package branded "dead" discredits the site. Making it a merge-gating test (Principle III) turns the fairness requirement into an enforced contract, and validating against real labelled data honours Principle XI.
- **Alternatives considered**: Manual spot-checks (not reproducible, not gating); synthetic packages (don't capture real "finished" nuance).

## 8. OG image and badge generation

- **Decision**: Generate OG images and badge artwork with **Satori/`@vercel/og`** in Next.js route handlers, rendered from the same score data and cached at the edge; badges served as SVG (crisp, tiny) with a PNG fallback.
- **Rationale**: Keeps generation colocated with the data and the cache layer, no separate image service; SVG badges are the README-native format maintainers expect.
- **Alternatives considered**: A standalone image microservice (unjustified complexity, Principle V); pre-rendering every image on each score change (wasteful vs cache-on-demand).

## 9. Placement-agnostic mounting (FR-027/028)

- **Decision**: All host-specific values (canonical base URL, brand tokens, nav slots, OSPulse on-ramp visibility) live in `packages/config`, injected at deploy time. The app reads a single config object; no host is hard-coded. Canonical URL and sitemap host are config-driven so the standalone-vs-OSPulse-section decision is a deployment variable set before launch.
- **Rationale**: Satisfies the deferred "Placement" decision from the spec without a rewrite; keeps SEO canonicalisation correct under either host.
- **Alternatives considered**: Two forks of the app (violates one-source-of-truth, Principle I/Tech Constraints); runtime host-sniffing (fragile, bad for canonical URLs).

## 10. Shared engine consumption by OSPulse (FR-026)

- **Decision**: Expose the scoring engine through a stable, SemVer-versioned package interface (`scorePackage(inputs) → { verdict, signals[], confidence }`) documented in `contracts/scoring-engine.md`. OSPulse consumes the same package; the Observatory adds only the public-presentation and single-package-cadence layer on top.
- **Rationale**: Guarantees the public tool is a faithful shop window for the paid one and that model improvements serve both (FR-026), with the contract stability Principle II requires.
- **Alternatives considered**: Reimplementing the model in OSPulse (drift, Principle I violation); a network service call from OSPulse to the Observatory (couples the paid product's availability to the public one — rejected).
