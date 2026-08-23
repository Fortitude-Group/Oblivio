import { test, expect } from "@playwright/test";

// US3: the methodology makes the numbers defensible.
test.describe("methodology (US3)", () => {
  test("every score links to the methodology", async ({ page }) => {
    await page.goto("/npm/lodash");
    await page.getByRole("link", { name: /full methodology/i }).click();
    await expect(page).toHaveURL(/\/methodology$/);
    await expect(
      page.getByRole("heading", { name: "Methodology" }),
    ).toBeVisible();
    await expect(page.getByText(/the fairness rule/i)).toBeVisible();
    await expect(page.getByText(/maintenance health, not vulnerability/i)).toBeVisible();
  });

  test("two packages are scored by the same rules, not hand-tuned", async ({
    page,
  }) => {
    const signalNames = async (path: string) => {
      await page.goto(path);
      const texts = await page.locator(".signal .name").allInnerTexts();
      return texts.map((t) => t.split("\n")[0]!.trim());
    };
    const a = await signalNames("/npm/lodash");
    const b = await signalNames("/npm/moment");
    // Same rubric → identical signal set on both packages.
    expect(a).toContain("Bus factor");
    expect(a).toContain("Time since last release");
    expect(b).toEqual(a);
  });
});
