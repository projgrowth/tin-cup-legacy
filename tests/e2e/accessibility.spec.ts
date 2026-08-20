import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/schedule",
  "/rosters",
  "/purse",
  "/profile",
  "/scout?course=south&card=true",
  "/photos",
];

test("public journeys have no serious WCAG 2.1 A/AA blockers", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tc-seat-v1", "guest");
  });
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockers = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(
      blockers.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
          html: node.html,
        })),
      })),
      `${route} has serious accessibility blockers`,
    ).toEqual([]);
  }
});

test("core content remains usable at 200 percent zoom", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "200% zoom is assessed from a desktop viewport.");
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your weekend" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
