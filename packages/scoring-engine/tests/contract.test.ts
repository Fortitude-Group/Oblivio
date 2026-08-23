import { describe, it, expect } from "vitest";
import { scorePackage, SIGNAL_CATALOGUE } from "../src/index";
import { totalActivityWeight } from "../src/rubric";
import { VALIDATION_SET } from "./validation-set";

const active = VALIDATION_SET.find(
  (c) => c.name === "npm/active-web-framework",
)!;
const finished = VALIDATION_SET.find(
  (c) => c.name === "npm/tiny-perfect-util",
)!;

describe("scoring-engine contract (contracts/scoring-engine.md)", () => {
  it("decomposes: overallScore equals the weighted activity sum (Gate B)", () => {
    const r = scorePackage(active.inputs);
    const expected =
      r.signals
        .filter((s) => s.kind === "activity")
        .reduce((acc, s) => acc + s.subScore * s.weight, 0) * 100;
    expect(r.overallScore).not.toBeNull();
    expect(r.overallScore!).toBeCloseTo(expected, 6);
  });

  it("activity weights sum to 1", () => {
    expect(totalActivityWeight()).toBeCloseTo(1, 6);
  });

  it("is deterministic: same inputs yield an identical result", () => {
    expect(scorePackage(active.inputs)).toEqual(scorePackage(active.inputs));
  });

  it("returns insufficient_data with no number when the repo is unresolvable", () => {
    const r = scorePackage({ ...active.inputs, repo: null });
    expect(r.verdict).toBe("insufficient_data");
    expect(r.overallScore).toBeNull();
    expect(r.confidence).toBe("insufficient_data");
  });

  it("overrides to archived with no number when the repo is archived", () => {
    const r = scorePackage({
      ...active.inputs,
      repo: { ...active.inputs.repo!, isArchived: true },
    });
    expect(r.verdict).toBe("archived");
    expect(r.overallScore).toBeNull();
  });

  it("never worse than stable_low_activity when no harm is present", () => {
    const r = scorePackage(finished.inputs);
    expect(["stable_low_activity", "actively_maintained"]).toContain(r.verdict);
  });

  it("exposes a code-canonical signal catalogue with global weights", () => {
    const activity = SIGNAL_CATALOGUE.filter((s) => s.kind === "activity");
    const harm = SIGNAL_CATALOGUE.filter((s) => s.kind === "harm");
    expect(activity.length).toBe(9);
    expect(harm.length).toBe(5);
    // No per-package parameters: harm carries weight 0, activity carries the weight.
    expect(harm.every((s) => s.weight === 0)).toBe(true);
  });
});
