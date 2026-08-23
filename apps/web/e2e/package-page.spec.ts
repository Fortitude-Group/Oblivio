import { test, expect } from "@playwright/test";

// US1: the searcher lands on a fair, complete package health page.
test.describe("package health page (US1)", () => {
  test("shows verdict, decomposed signals, key facts and links", async ({
    page,
  }) => {
    await page.goto("/npm/lodash");

    // Verdict.
    await expect(page.locator(".verdict-pill")).toContainText(
      /stable, low activity/i,
    );
    // Score ring shows a number out of 100.
    await expect(page.locator(".ring-score")).toBeVisible();
    await expect(page.locator(".ring-out")).toContainText("/ 100");

    // Signal breakdown: every number decomposed.
    await expect(page.getByText("How this score is built")).toBeVisible();
    await expect(page.locator(".signal")).not.toHaveCount(0);

    // Key facts incl. last updated.
    await expect(page.getByText("Latest release")).toBeVisible();
    await expect(page.getByText("Bus factor", { exact: true })).toBeVisible();
    await expect(page.locator(".updated")).toContainText(/updated/i);

    // Links out.
    await expect(
      page.getByRole("link", { name: /view source repository/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /npm registry/i }),
    ).toBeVisible();

    // The reassuring, fairness-forward harm banner.
    await expect(page.getByText(/no dependent-facing harm signals/i)).toBeVisible();
  });

  test("insufficient data shows no fabricated score", async ({ page }) => {
    await page.goto("/pypi/pydantic");
    await expect(page.locator(".verdict-pill")).toContainText(
      /insufficient data/i,
    );
    await expect(page.getByText("No score")).toBeVisible();
    // No "/ 100" numeric readout on the ring.
    await expect(page.locator(".ring-out")).toHaveCount(0);
  });
});
