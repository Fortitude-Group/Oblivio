import { describe, it, expect } from "vitest";
import { sparklinePaths } from "../lib/chart";

describe("sparklinePaths", () => {
  it("maps a rising series to points with a falling y (100 at top)", () => {
    const { points, line, area } = sparklinePaths([20, 50, 90], 100, 100, 10);
    expect(points).toHaveLength(3);
    // First point is lowest score → largest y; last is highest → smallest y.
    expect(points[0]!.y).toBeGreaterThan(points[2]!.y);
    expect(points[0]!.x).toBeLessThan(points[2]!.x);
    expect(line.startsWith("M")).toBe(true);
    expect(area.endsWith("Z")).toBe(true);
  });

  it("clamps scores to the 0..100 band", () => {
    const { points } = sparklinePaths([0, 100], 100, 100, 0);
    expect(points[0]!.y).toBe(100); // score 0 → bottom
    expect(points[1]!.y).toBe(0); // score 100 → top
  });

  it("centres a single point", () => {
    const { points } = sparklinePaths([50], 100, 100, 10);
    expect(points[0]!.x).toBe(50);
  });
});
