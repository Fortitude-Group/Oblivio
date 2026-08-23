import { test, expect } from "@playwright/test";

// US2: the browser explores the ecosystem, lists, and search.
test.describe("front page, leaderboards and search (US2)", () => {
  test("front page shows the headline finding and breakdown", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".headline .big")).toContainText("%");
    await expect(
      page.getByText(/most-depended-on packages we track show abandonment/i),
    ).toBeVisible();
    await expect(page.locator(".breakdown .chip")).not.toHaveCount(0);
  });

  test("a leaderboard opens at its own URL with ranked items", async ({
    page,
  }) => {
    await page.goto("/lists/single-maintainer");
    await expect(
      page.getByRole("heading", { name: /one person away from trouble/i }),
    ).toBeVisible();
    await expect(page.getByText(/bus factor of one/i)).toBeVisible();
    await expect(page.locator(".lb-row").first()).toBeVisible();
  });

  test("search navigates to a package page", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/search a package/i).fill("lodash");
    const result = page.locator(".search-results .sr", { hasText: "lodash" });
    await expect(result.first()).toBeVisible();
    await result.first().click();
    await expect(page).toHaveURL(/\/npm\/lodash$/);
    await expect(page.locator(".pkg-name")).toContainText("lodash");
  });

  test("ecosystem overview has its own headline", async ({ page }) => {
    await page.goto("/npm");
    await expect(page.locator(".headline .big")).toContainText("%");
    await expect(page.getByText(/most-depended-on/i)).toBeVisible();
  });
});
