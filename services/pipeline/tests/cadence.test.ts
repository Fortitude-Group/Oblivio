import { describe, it, expect } from "vitest";
import { cadenceFits, CADENCE, DAY } from "../src/schedule/cadence";

// Gate C / SC-004: the working universe must fit inside the API budget.
describe("cadence dry-run (Gate C)", () => {
  it("the 10k universe fits the GitHub budget on the weekly deep-repo cadence", () => {
    const { callsPerHour, fits } = cadenceFits(10_000, CADENCE.deepRepo);
    expect(fits).toBe(true);
    // ~10k * 6 calls / (168 hours) ≈ 357 calls/hour, well under 5000.
    expect(callsPerHour).toBeLessThan(5000);
  });

  it("does NOT fit if you try to deep-refresh 100k packages every day", () => {
    expect(cadenceFits(100_000, DAY).fits).toBe(false);
  });

  it("scales: a 50k universe still fits weekly", () => {
    expect(cadenceFits(50_000, CADENCE.deepRepo).fits).toBe(true);
  });
});
