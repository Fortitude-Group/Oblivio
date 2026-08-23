import { describe, it, expect } from "vitest";
import { scorePackage } from "../src/index";
import { VALIDATION_SET } from "./validation-set";

/**
 * Gate A (SC-001): the blocking fairness gate. The model MUST separate "at risk"
 * from "stable/finished" with high precision on the finished-but-healthy class.
 * If it brands complete, stable packages as dead, it is not shippable.
 */
describe("fairness gate (Gate A / SC-001)", () => {
  const results = VALIDATION_SET.map((c) => ({
    ...c,
    verdict: scorePackage(c.inputs).verdict,
  }));

  const HEALTHY = new Set(["actively_maintained", "stable_low_activity"]);
  const NOT_HEALTHY = new Set(["at_risk", "slowing_down", "archived"]);

  it("never brands a finished-but-healthy package as at risk", () => {
    const finished = results.filter((r) => r.label === "finished_healthy");
    for (const r of finished) {
      expect(
        HEALTHY.has(r.verdict),
        `${r.name} was classified ${r.verdict}: ${r.rationale}`,
      ).toBe(true);
    }
  });

  it("achieves >=95% precision on the finished_healthy class", () => {
    const finished = results.filter((r) => r.label === "finished_healthy");
    const correct = finished.filter((r) => HEALTHY.has(r.verdict)).length;
    const precision = correct / finished.length;
    expect(precision).toBeGreaterThanOrEqual(0.95);
  });

  it("catches genuinely abandoned packages", () => {
    const abandoned = results.filter((r) => r.label === "abandoned");
    const caught = abandoned.filter((r) => NOT_HEALTHY.has(r.verdict)).length;
    expect(caught / abandoned.length).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies active packages as actively maintained", () => {
    const active = results.filter((r) => r.label === "active");
    for (const r of active) {
      expect(r.verdict).toBe("actively_maintained");
    }
  });
});
