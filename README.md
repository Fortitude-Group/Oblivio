# The Observatory

A free, honest health check for the open-source packages the world depends on.

Every engineer eventually asks the same question about a dependency: is this thing
still maintained? There's never been a canonical, free, trustworthy place to
check. The Observatory answers it for one package at a time, for the whole world,
and it publishes exactly how it reaches every verdict.

It's built by Fortitude Omnis as the free, single-package face of the same
intelligence OSPulse sells at depth (whole-dependency-tree monitoring, alerting
and policy).

## What it does

- Scores the maintenance health of the most-depended-on npm and PyPI packages.
- Gives each package a plain-language verdict (actively maintained, stable and
  low activity, slowing down, at risk, archived, or insufficient data) backed by
  named, sourced signals.
- Publishes a headline finding over an auditable universe, per-ecosystem
  overviews, and shareable leaderboards (the packages that are widely used yet at
  risk, the ones resting on a single maintainer, and the healthiest heavyweights).
- Offers a free read-only API, embeddable badges, and auto-generated share cards.

## The one rule that matters

A small, complete package that hasn't changed in three years because it's
finished is not abandoned. The scoring weights dependent-facing harm (unanswered
security issues, breakage, neglected pull requests) above raw commit silence, so a
quiet package is never branded dead. A blocking test enforces this: the model has
to keep high precision on the finished-but-healthy class before any score can
ship. Get that wrong and one screenshot discredits the whole site, so it's the
first thing the test suite checks.

Two more promises hold everywhere:

- Insufficient data returns no number, never a fabricated low score.
- No package's verdict blames the people behind it. Abandonment is a risk, not a
  moral failing, and a low bus factor is a fact, not an accusation.

## How it's built

A pnpm monorepo:

- `packages/scoring-engine` — the transparent weighted rubric. Pure, deterministic,
  fully decomposable. This is the shared model OSPulse consumes too.
- `packages/ingestion` — pluggable registry (npm, PyPI) and repo-host (GitHub App,
  GitLab) adapters, plus the universe builder and conservative harm mining.
- `packages/db` — Postgres schema with append-only score history, guarded by a
  database trigger so history can only be added to.
- `services/pipeline` — the score-and-persist spine.
- `apps/web` — the Next.js site, the public API, badges and share cards.

## Running it locally

You'll need Node 22, pnpm, and Docker.

```bash
pnpm install
pnpm dev:stack                       # Postgres + Redis
pnpm --filter @observatory/db db:migrate
```

Ingesting real data needs a GitHub App credential (App id, installation id, and a
private key) in the environment. Then:

```bash
# Score one package end to end
pnpm exec tsx scripts/ingest-one.ts npm lodash

# Build and score a whole universe (powers the headline)
pnpm exec tsx scripts/build-universe.ts npm
pnpm exec tsx scripts/build-universe.ts pypi

# Run the site
pnpm --filter @observatory/web dev   # http://localhost:3010
```

## Tests and gates

```bash
pnpm build          # typecheck the workspace
pnpm test           # unit + integration (DB tests skip without DATABASE_URL)
pnpm test:fairness  # the blocking fairness gate
pnpm guards         # no-blame framing, telematics exclusion, read-only
pnpm test:e2e       # Playwright end-to-end (needs the site running with data)
```

## The public API

Free, read-only, no account, attribution requested. See `/api-docs`. Fair use is
120 requests a minute per IP. Every response carries an `as_of` and an
`attribution` field, and a breaking change becomes `/api/v2`.

## Methodology

Every signal, weight and fairness rule is documented at `/methodology`, generated
from the live model so it can't drift from the numbers you see. If you can dispute
a score, the answer is data, not opinion.
