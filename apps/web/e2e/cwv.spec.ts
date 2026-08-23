import { test, expect } from "@playwright/test";

/**
 * Core Web Vitals check for the package page (SC-007). Layout stability (CLS)
 * is asserted strictly since it holds in dev; LCP is asserted with a
 * dev-tolerant ceiling here (dev builds are unoptimised). The production p75
 * target of LCP ≤ 2.5s is a Lighthouse run against `next start`, a follow-up.
 */
test("package page: CLS is negligible and LCP is reasonable", async ({
  page,
}) => {
  await page.goto("/npm/lodash", { waitUntil: "load" });

  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1] as
            | (PerformanceEntry & { startTime: number })
            | undefined;
          if (last) resolve(last.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(0), 5000);
      }),
  );

  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let value = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<
            PerformanceEntry & { value: number; hadRecentInput: boolean }
          >) {
            if (!entry.hadRecentInput) value += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(value), 2500);
      }),
  );

  expect(cls).toBeLessThan(0.1);
  expect(lcp).toBeLessThan(4000);
});
