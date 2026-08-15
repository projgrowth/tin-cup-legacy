import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Durable skip — matches production markIntroSeen shape.
    localStorage.setItem("tc-intro-v1", JSON.stringify({ seenAt: Date.now(), version: 1 }));
    localStorage.setItem("tc-seat-v1", "guest");
    sessionStorage.setItem("tc-intro-played", "1");
  });
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("home loads its local brand and command center", async ({ page }) => {
  const logoRequest = page.waitForResponse((response) =>
    response.url().endsWith("/tin-cup-logo.png"),
  );
  await page.goto("/");
  await expect(page.getByText("First tee · Friday 12:19 PM")).toBeVisible();
  await expect(page.getByText("Today at Tin Cup")).toHaveCount(0);
  expect((await logoRequest).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Captain score input" })).toHaveCount(0);
  await expect(page.getByText("Minutes", { exact: true })).toBeVisible();
  await expect(page.getByText("Secs", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("weekend, scout and purse retain confirmed source-of-truth details", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /Friday · South/i })).toBeVisible();
  await expect(page.getByText("Zack / Chris")).toBeVisible();
  await expect(page.getByText("Charles / Blake")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/scout");
  await page.getByRole("tab", { name: /South/i }).click();
  await expect(page.getByRole("link", { name: /^Card$/ })).toBeVisible();
  await expect(page.getByText(/Black 335/)).toBeVisible();
  await page.getByRole("link", { name: /^Card$/ }).click();
  await expect(page.getByRole("heading", { name: /South game plan/i })).toBeVisible();
  await expect(page.getByText("335 yds").first()).toBeVisible();
  await page.getByRole("tab", { name: /Copperhead/i }).click();
  await expect(page.getByRole("heading", { name: /Copperhead game plan/i })).toBeVisible();
  await page.getByRole("tab", { name: /Island/i }).click();
  await expect(page.getByRole("heading", { name: /Island game plan/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/purse");
  const payment = page.getByRole("link", { name: /Pay \$150/ }).first();
  await expect(payment).toHaveAttribute("href", /https:\/\/venmo\.com\/Kmaher.*amount=150/);
  await expect(page.getByText("$800").first()).toBeVisible();
  // Kevin admin: CTP $100, LD $100; contest holes stay TBD (captains set pairings only).
  await expect(page.getByText("$100", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hole TBD").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$93");
  await expect(page.locator("main")).not.toContainText("$120");
  await expect(page.locator("main")).not.toContainText("Contest payouts are TBD.");
  await expectNoHorizontalOverflow(page);
});
