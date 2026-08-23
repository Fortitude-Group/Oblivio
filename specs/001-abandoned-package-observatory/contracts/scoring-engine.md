# Contract: Scoring Engine Interface (`packages/scoring-engine`)

**Feature**: 001-abandoned-package-observatory | **Status**: v1 (SemVer; the shared model consumed by both the Observatory and OSPulse, FR-026)

This is a published internal contract (Principle II): both consumers pin a version; a breaking change to the input shape, verdict set, or breakdown structure is a MAJOR bump with a migration note.

## Core function
```ts
scorePackage(inputs: ScoringInputs): ScoreResult
```
Pure and deterministic: identical `inputs` always yield an identical `ScoreResult` (Principle IV). No I/O, no clock reads, no randomness inside the engine — the caller snapshots inputs (including any "as of" times) and passes them in.

## `ScoringInputs` (snapshotted, no live fetches)
- Registry facts: `latestReleaseAt`, `releaseDates[]`, `isDeprecated`, `downloadCount`.
- Repo activity (or `null` when unresolvable): `lastCommitAt`, `commitActivitySeries`, `openIssues`, `issueResponseLatency`, `issueResponseSeries`, `openPrs`, `prMergeLatency`, `openPrBacklogSeries`, `contributorCount`, `busFactor`, `topContributorShare`, `lastActiveMaintainerAt`, `isArchived`, `lookingForMaintainer`.
- Harm signals (fairness inputs): `unansweredSecurityIssues`, `dependentBreakageReports`, `neglectedOpenPrs`, `semverStagnationWithOpenBugs`.
- `asOf`: the freshness timestamp for these inputs (carried through, not used in math).

## `ScoreResult`
```ts
{
  verdict: 'actively_maintained' | 'stable_low_activity' | 'slowing_down' | 'at_risk' | 'archived' | 'insufficient_data',
  overallScore: number | null,              // null iff insufficient_data
  confidence: 'high' | 'medium' | 'insufficient_data',
  signals: Array<{ key: string; rawValue: number | null; subScore: number; weight: number; sourceRef: string }>,
  trendDirection?: 'improving' | 'stable' | 'declining'  // set by caller from history, not the pure fn
}
```

## Guarantees (tested — Principle III)
1. **Decomposability (Gate B)**: `overallScore` equals the documented weighted combination of `signals[].subScore * weight`; every published number is present in `signals`.
2. **Hard overrides**: `isArchived → archived`; missing repo activity → `insufficient_data` with `overallScore: null` (never a low number, FR-007/032).
3. **Fairness (Gate A)**: a `finished_healthy` input profile (no releases for years but zero harm signals) MUST NOT map to `at_risk`/`slowing_down`; harm signals outweigh raw commit silence. Enforced by the blocking validation harness over the labelled set (SC-001, ≥95% precision on `finished_healthy`).
4. **Global weights**: weights are module constants; no per-package parameters (FR-009).
5. **Determinism**: property test — same inputs → identical result across runs.

## Consumption
- Observatory pipeline: fetch → snapshot inputs → `scorePackage` → persist `ScoreSnapshot` → set `trendDirection` from history.
- OSPulse: same package/version, applied across a whole dependency tree continuously (its own cadence/alerting layer sits on top; the engine is unchanged).
