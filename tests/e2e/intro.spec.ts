import { expect, test } from "@playwright/test";

test("mobile intro reveals the mark from the trophy shield near the end", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The cinematic intro is tuned for phone viewports.");

  await page.addInitScript(() => {
    window.localStorage.removeItem("tc-intro-v1");
    window.sessionStorage.removeItem("tc-intro-played");
  });
  await page.goto("/");

  const intro = page.getByLabel("Tin Cup Invitational film intro");
  const mark = page.locator(".intro-mark-anchor");
  const skip = page.getByRole("button", { name: "Skip intro" });

  await expect(intro).toBeVisible();
  await expect(mark).not.toHaveClass(/intro-mark-visible/);

  const skipBox = await skip.boundingBox();
  expect(skipBox?.height).toBeGreaterThanOrEqual(44);

  await page.waitForTimeout(4_750);
  await expect(mark).toHaveClass(/intro-mark-visible/);
  await expect(mark).toHaveCSS("opacity", "1", { timeout: 1_500 });

  const viewport = page.viewportSize();
  const markBox = await mark.boundingBox();
  expect(viewport).not.toBeNull();
  expect(markBox).not.toBeNull();
  expect((markBox?.x ?? -1) + (markBox?.width ?? 0) / 2).toBeCloseTo((viewport?.width ?? 0) / 2, 0);

  await page.screenshot({ path: "test-results/mobile-intro-shield.png" });
});

test("intro does not replay after skip (localStorage)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Intro is mobile-tuned.");

  await page.addInitScript(() => {
    window.localStorage.removeItem("tc-intro-v1");
    window.sessionStorage.removeItem("tc-intro-played");
  });
  await page.goto("/");
  await expect(page.getByLabel("Tin Cup Invitational film intro")).toBeVisible();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByLabel("Tin Cup Invitational film intro")).toHaveCount(0, {
    timeout: 3_000,
  });

  await page.reload();
  await expect(page.getByLabel("Tin Cup Invitational film intro")).toHaveCount(0);
  await expect(page.getByText("First tee · Friday 12:19 PM")).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in · claim your spot/ })).toBeVisible();
});
