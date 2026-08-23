import { test, expect } from "@playwright/test";

// US5: the honest on-ramp — OSPulse and PoisonBox, with nothing gated.
test("on-ramp shows both CTAs and gates no data", async ({ page }) => {
  await page.goto("/npm/lodash");

  const ospulse = page.getByRole("link", { name: /explore ospulse/i });
  const poisonbox = page.getByRole("link", { name: /explore poisonbox/i });
  await expect(ospulse).toBeVisible();
  await expect(poisonbox).toBeVisible();

  // Exactly one on-ramp block.
  await expect(page.locator(".onramp")).toHaveCount(1);

  // The full signal breakdown is present on the same free page: nothing gated.
  await expect(page.locator(".signal")).not.toHaveCount(0);
  await expect(page.getByText("Embed the badge")).toBeVisible();
});
