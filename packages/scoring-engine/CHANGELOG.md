# Changelog — @observatory/scoring-engine

This package is a **published contract** (constitution Principle II). It is the
shared health/abandonment model consumed by both the Observatory pipeline and
OSPulse (spec FR-026). Every consumer MUST pin an explicit version.

Versioning is SemVer over the contract surface, which is:

- the `ScoringInputs` shape,
- the `ScoreResult` shape (including the verdict set and `signals[]` entry shape),
- the exported `SIGNAL_CATALOGUE`.

A breaking change to any of those is a MAJOR bump with a migration note here.
Adjusting a weight or a threshold is a MINOR bump (it changes published numbers,
so it is called out); an internal refactor with identical outputs is a PATCH.

## 1.0.0 — 2026-08-22

- Initial contract: `scorePackage(inputs)` returning a decomposable verdict over
  nine weighted activity signals plus harm-signal overrides.
- Fairness rule ("finished is not abandoned"): with no dependent-facing harm
  signals present, a package is never worse than `stable_low_activity`, however
  quiet its commit history. Harm signals (unanswered security issues, dependent
  breakage, neglected PRs, semver stagnation with open bugs, looking-for-
  maintainer) are what move a package to `slowing_down` / `at_risk`.

### Consumers and their pins

- Observatory pipeline (`services/pipeline`): pin `^1.0.0`.
- OSPulse: pin an explicit `1.x` and upgrade deliberately.
