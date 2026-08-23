import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility: no serious or critical violations on the key surfaces.
for (const path of ["/", "/npm/lodash", "/lists/single-maintainer", "/methodology"]) {
  test(`no serious/critical a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    if (serious.length > 0) {
      console.log(
        serious.map((v) => `${v.id}: ${v.nodes.length} nodes`).join("\n"),
      );
    }
    expect(serious).toEqual([]);
  });
}
