# BRAINSTORM — The Observatory: abandoned-package observatory (Fortitude Omnis R&D build)
Folder: `observatory` | Status: R&D BUILD — public data utility, top-of-funnel traffic engine for the Fortitude / OSPulse sites
Use with: `/speckit.specify` — paste the sections below as the feature description.
Working name "The Observatory" (a place you watch the ecosystem from). Rename freely. Hosting placement (standalone on the Fortitude corporate site vs a section within the OSPulse site) is DEFERRED — see "Placement".

---

## One-liner
A public, free, continuously-updated dashboard that measures the health and abandonment risk of the open-source packages the world depends on — last release, maintainer responsiveness, bus factor, decay trend — with a headline number nobody else publishes ("X% of the most-depended-on packages show signs of abandonment"), individual package health pages that rank in search, and an honest methodology — built to be genuinely useful, widely cited, and therefore a steady stream of the right visitors to the Fortitude and OSPulse sites.

## The prime directive (read this first, it governs every trade-off)
Two jobs, ranked:
1. **Be a genuinely useful, trustworthy public utility that people link to, cite, and return to.** Traffic to the Fortitude sites is the goal, but it is *earned*, not extracted: the way this drives visitors is by being the free thing developers bookmark, journalists quote, and Google surfaces when someone searches "is <package> still maintained". Usefulness and credibility ARE the growth strategy. Anything that makes it feel like a lead-gen funnel wearing a lab coat (gated data, alarmist scores, fake urgency) destroys the exact trust that generates the traffic. Give the value away.
2. **Feed OSPulse.** The Observatory is the public, free, single-package-at-a-time face of the same intelligence OSPulse sells at depth (monitoring, alerting, policy, whole-dependency-tree analysis, private repos). It is the free tier's free tier: a credibility demonstration and a natural on-ramp, never a crippled demo.

The relationship is: The Observatory answers "is this one package healthy?" for the whole world, free, forever. OSPulse answers "are all 2,000 packages in my org healthy, and tell me the moment one changes" for paying teams.

## Why (context — do not re-litigate in the spec session)
- Open source runs on unpaid, overloaded, and often departed maintainers (xkcd 2347 is the meme; the reality is worse). "Is this dependency still maintained?" is a question every engineer asks and nobody can answer quickly. There is no canonical, free, trustworthy place to check.
- Abandonment is a *leading* indicator of supply-chain risk that CVE scanners miss entirely: an unmaintained package won't get security fixes, is a prime target for malicious takeover, and rots silently. This is OSPulse's core thesis, made public and free.
- Public data utilities are the highest-leverage top-of-funnel a technical company can build. They earn backlinks (the durable SEO asset), get cited in articles and talks, and rank for thousands of long-tail "<package> alternatives / is <package> maintained / <package> dead" searches — traffic that compounds and doesn't need paying for. This is precisely the marketing the author is equipped to produce (build a useful thing, publish the method) and not equipped to produce (ads, outbound).
- The raw data is public and free: package registries (npm, PyPI, crates, Maven, NuGet, RubyGems, Go, Packagist), their download/dependent stats, and the source repos (GitHub/GitLab) with commit, release, issue, and PR activity. The intelligence is in combining it fairly into a defensible signal — which is the same hard, credible work that makes OSPulse worth paying for.

## Target user (three of them)
- **The searcher:** a developer who Googles "is left-pad maintained" or "moment.js dead" and lands on the package's Observatory health page. They get a clear, fair answer and a methodology they trust. This is the traffic. Their landing page must be excellent and must rank.
- **The browser:** someone who arrives at the front page for the headline finding ("we scanned the 10,000 most-depended-on packages; here's the state of the ecosystem"), explores the leaderboards and trends, and shares it. This is the press and the social spread.
- **The professional:** a security/platform engineer who realises they need this for their *whole* dependency tree, continuously, with alerts — and clicks through to OSPulse. This is the conversion, and it must feel like a natural next step, not a paywall ambush.

## What to build (scope of THIS spec)

### A. The data pipeline (the truth source)

1. **Registry + repo ingestion.** Ingest package metadata from the major registries (npm and PyPI first; then crates, Maven, NuGet, RubyGems, Go, Packagist) — versions, release dates, download counts, declared repository, declared licence, dependents. Resolve each package to its source repo and ingest repo activity (commits, releases/tags, issues opened/closed/response-times, PRs opened/merged/response-times, contributors over time) via the host APIs (GitHub/GitLab), respecting rate limits and terms.
2. **The "most-depended-on" universe.** Define and maintain the working set: the top N packages per ecosystem by transitive dependents / downloads (start ~10k total, scale up). This universe is what the headline findings are computed over and must be transparent and reproducible.
3. **Health / abandonment model.** A transparent, multi-signal score per package. Signals include: time since last release; release cadence trend (slowing?); commit activity trend; issue response latency and its trend; PR merge latency and open-PR backlog growth; bus factor / contributor concentration (one-maintainer risk); maintainer departure signals (a formerly-active sole maintainer going quiet); archived/deprecated flags; and explicit "looking for maintainer" / hand-off signals in repo metadata. Every signal is documented, every score decomposes into its signals, and confidence is expressed (a package with a private or unresolvable repo gets "insufficient data", never a fabricated score).
4. **Fairness rules (first-class, not an afterthought).** Abandonment ≠ moral failing, and a "done" package (small, stable, complete, correctly not changing) is NOT abandoned. The model must distinguish "finished and stable" from "rotting and at risk" — e.g. by weighting unanswered security issues, dependent-facing breakage, and open-PR neglect over raw commit silence. A tiny utility that hasn't changed in three years because it's perfect must not be branded dead. This distinction is the credibility linchpin; get it wrong and the whole thing is dismissed.
5. **Trend / decay tracking.** Store history so the score has a *direction* (improving / stable / declining) and so the site can show "this package's health over time" and detect the moment a package starts sliding. History is also what makes re-visits valuable and what OSPulse productises as alerting.
6. **Continuous updates.** The pipeline re-runs on a cadence (spec decides per data source; heavier repos less often, registry metadata more often) so the data is live, not a one-off snapshot. "Last updated" is shown everywhere. Freshness is part of the trust.

### B. The public site (the traffic engine)

7. **Per-package health pages — the SEO surface.** One clean, fast, public page per package: the health score with its signal breakdown, the trend chart, key facts (last release, maintainers, bus factor, dependents, licence), a plain-language verdict ("actively maintained" / "stable, low activity" / "slowing down" / "at risk" / "archived"), and links to the repo and registry. These pages are the long-tail traffic: thousands of them, each ranking for "<package> maintained / alternatives / dead". They must be genuinely useful, fast, statically-served where possible, and richly marked up (see SEO below). This is the single most important surface in the project.
8. **The front page — the headline finding.** A continuously-updated state-of-the-ecosystem view with the shareable big number ("X% of the 10,000 most-depended-on packages show abandonment signals"), broken down by ecosystem, with the most striking findings surfaced. This is the press-bait and the social share. It updates, so it's re-quotable ("as of this month…").
9. **Leaderboards & lists (each a shareable, linkable artefact):** most-depended-on-yet-at-risk packages (the scary, important list); single-maintainer packages the world depends on (the xkcd-2347 list, made real); recently-declining packages (early warnings); recently-archived-but-still-widely-used; healthiest large projects (a positive list, so it's not pure doom). Each list is its own URL with its own OG card.
10. **Search.** Fast search for any package to land on its health page (mirrors the Google entry path for people who arrive at the front page first).
11. **Ecosystem pages.** Per-ecosystem overviews (npm health, PyPI health…) — each a linkable, rankable landing page with that ecosystem's headline stats and lists.
12. **Methodology page (non-negotiable, ships with v1).** A full, honest explanation of every signal, how the score is computed, the fairness rules, what the score does and doesn't mean, data sources and their limits, and update cadence. This page is why people trust the numbers enough to cite them. Link to it from every score.
13. **Data access / embeds (link-earning multipliers):** a public badge per package (a README badge — "Observatory: actively maintained" — that maintainers embed, each one a backlink and a distribution vector), shareable OG images auto-generated per package/list showing the score and trend, and a free read-only public API / data export (with attribution requested) so researchers and other tools build on it and cite the source. Badges and an API are how a data utility spreads itself.

### C. The OSPulse on-ramp (earned, not extracted)

14. **Honest conversion surfaces.** On per-package pages and lists, a genuinely relevant, non-alarmist prompt: "Want this for your whole dependency tree, monitored continuously with alerts? → OSPulse." Framed as the obvious next step for the professional use case, never as unlocking data that should be free. The single-package public value is complete on its own; OSPulse is scale + monitoring + policy, which is a different job, not the same job behind a paywall.
15. **Shared intelligence core.** Architect the health/abandonment model as a shared engine the Observatory (public, single-package, periodic) and OSPulse (private, whole-tree, continuous, alerting) both consume, so improvements to the model serve both and the public tool stays a faithful shop window for the paid one.

## Explicitly OUT of scope (for this spec)
- User accounts, monitoring, alerting, saved packages, dependency-tree upload/analysis. Those are OSPulse. The Observatory is stateless and public: one package or one list at a time, no login. (An anonymous "check my package.json" one-shot could be a future bridge feature, but it edges into OSPulse territory — keep it out of v1.)
- Vulnerability/CVE scanning, reachability, SBOMs. Different tools (OSPulse, Strata, project 5). The Observatory measures *maintenance health*, which is upstream of and distinct from known-vuln scanning — say so.
- Any paid tier, gating, or data behind a login on the Observatory itself. The whole point is that it's free and open; monetisation is the click-through to OSPulse, nothing else.
- Naming-and-shaming individual maintainers, or any framing that blames volunteers. Fairness rules forbid it and so does decency.
- Automated outreach to maintainers, "claim your package" flows, or writing to repos. Read-only observation.
- Editorialising / manual curation of scores. Scores are computed and reproducible; no hand-tuning individual packages (that would destroy the "fair and automated" credibility).
- Ecosystems beyond the first two (npm, PyPI) in the initial build; the pipeline is pluggable and the rest follow.

## Kill criteria / honesty gates (build into the harness from day one)
- Gate A (the fairness test — the one that matters most): on a hand-labelled validation set of packages with known status (genuinely abandoned; actively maintained; and critically, "finished/stable but not abandoned" — small perfect utilities, and large mature slow-moving projects), the model must correctly separate "at risk" from "stable/finished" with high precision on the "finished but healthy" class specifically. If it brands stable, complete packages as dead, it is not shippable — that single false positive, screenshotted, discredits the whole site.
- Gate B (defensibility): every published score decomposes into named signals a skeptical developer can check against the public repo, and the methodology page fully accounts for it. If a maintainer disputes a score, the answer is data, not opinion. A score we can't defend in a GitHub issue is a score we don't publish.
- Gate C (freshness & scale): the pipeline sustains the working universe (start ~10k packages) on its update cadence within API rate limits, with "last updated" honestly shown. Stale data presented as live is a fail.
- Gate D (it earns links / traffic — the actual objective): within a defined window post-launch, the site earns organic inbound links and search-driven visits to per-package pages (set concrete targets in spec — e.g. per-package pages indexed and ranking for "<package> maintained" queries; N referring domains). If nobody links or lands, the utility isn't useful or discoverable enough — revisit the per-package page quality and the headline finding, not the funnel.
- Honesty rule, absolute: scores reflect real, sourced, reproducible signals. No inflating risk for drama, no alarmist verdicts to drive OSPulse clicks, no "insufficient data" dressed up as a low score. The traffic depends on trust; trust depends on honesty; the two are the same asset.

## Constraints & guardrails
- **Give the value away.** Every trade-off between "more useful to the public" and "more pressure toward OSPulse" resolves toward useful. The funnel works *because* the tool is unimpeachably generous. State this in the methodology and honour it in the UI.
- **Fairness is the credibility linchpin.** The "finished ≠ abandoned" distinction, the no-blame framing, and the defensible-per-signal scoring are what separate this from a cheap FUD generator. They are requirements, not tone.
- **Per-package pages are the product.** They are the traffic surface; they must be fast, static-where-possible, beautiful enough to share, and technically excellent for SEO. Treat them as the primary deliverable, the front page second.
- **SEO is a first-class engineering requirement**, not marketing dust: server-rendered/static per-package pages, clean stable URLs (`/npm/lodash`, `/pypi/requests`), full metadata + OG/Twitter cards + JSON-LD (`Dataset` / `SoftwareApplication` / `TechArticle` as fits), XML sitemaps covering the whole universe, fast Core Web Vitals, and internal linking between related packages. The long-tail ranking IS the growth mechanism.
- **Respect data-source terms and rate limits.** Registry and repo-host APIs have terms; the pipeline must be a good citizen (caching, backoff, attribution, no ToS breaches). Being blocked by GitHub for hammering their API kills the project.
- Placement-agnostic build (see below): the site must be able to live either standalone under the Fortitude corporate domain or as a section within the OSPulse site, so keep it a self-contained app with its own data store and its own front end that can be mounted in either place. Don't hard-wire either host.
- Public repo from day one; methodology and data sources documented openly (openness is itself a trust signal for a data utility).
- Livery: match the Fortitude / OSPulse house style (tokens from the corporate site) so it reads as an official Fortitude property wherever it's mounted.
- Keep fleet/vehicle telematics packages out of any hand-picked examples and copy.

## Placement (DEFERRED — do not decide in this spec, but build to allow both)
The site may live standalone on the Fortitude corporate site OR within/alongside the OSPulse site. Consequences to keep open: URL structure and canonical domain (affects SEO — decide before launch, not before build), navigation and cross-linking, and how prominently the OSPulse on-ramp features. Build as a self-contained, mountable property with configurable base URL and branding slots so the placement decision is a deployment choice, not a rewrite.

## Open questions for the spec session
1. The score itself: a transparent weighted rubric (fully explainable, easy to defend, easy to game/argue) vs a learned model (better separation, harder to explain)? For a tool whose entire value is defensibility, explainability probably wins — confirm, and if learned, how is per-signal decomposition preserved for Gate B?
2. The "finished ≠ abandoned" classifier (Gate A): what signals best distinguish a complete, stable package from a rotting one — unanswered *security* issues, dependent breakage reports, open-PR neglect, semver stagnation with open bugs? How is the validation set built and labelled?
3. Repo-host API budget: GitHub/GitLab rate limits vs a 10k+ package universe updated on a cadence — what caching, auth (app vs token), and refresh strategy keeps it fresh (Gate C) without breaching terms? Does the universe size need to start smaller?
4. "Most-depended-on" definition: by direct dependents, transitive dependents, or downloads? Per-ecosystem or global? This defines the headline finding's denominator and must be transparent and stable over time for trend claims.
5. Update cadence per signal: registry metadata (cheap, frequent) vs deep repo analysis (expensive, less frequent) — what mixed cadence keeps scores current and honest?
6. Badge + API abuse/cost: a public badge and open API are link multipliers but also load and abuse surface — caching, rate limits, and cost control without requiring accounts?
7. Hosting/rendering for tens of thousands of SEO pages: fully static generation (fast, cheap, great CWV, but rebuild cost at scale) vs server-rendered-and-cached? What holds up as the universe grows to 100k pages?
8. OSPulse on-ramp placement and wording: how present is it on per-package pages before it starts to erode the "free and generous" trust? Where's the line?
