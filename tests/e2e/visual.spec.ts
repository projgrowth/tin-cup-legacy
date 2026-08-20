import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tc-intro-v1", JSON.stringify({ seenAt: Date.now(), version: 1 }));
    localStorage.setItem("tc-seat-v1", "guest");
    sessionStorage.setItem("tc-intro-played", "1");
  });
});

test("responsive Home and gallery compose without overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Around the weekend" })).toBeVisible();
  await expect(page.getByText("Welcome to the Clubhouse")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: "The camera roll" })).toBeVisible({
    timeout: 15_000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("gallery.png"), fullPage: true });
});

test("post-event recap remains composed", async ({ page }, testInfo) => {
  await page.goto("/?story=recap");
  await expect(
    page.getByRole("heading", { name: /wins the Cup|all square|still being written/i }),
  ).toBeVisible({ timeout: 15_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("recap.png"), fullPage: true });
});
