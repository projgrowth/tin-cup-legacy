import { expect, test } from "@playwright/test";

test("mobile first visit opens directly into the personalized weekend", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-specific entry contract.");
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto("/");

  await expect(page.getByLabel("Tin Cup Invitational film intro")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "This weekend" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /4th Annual Tin Cup Invitational/i }),
  ).toBeVisible();
  const action = page.getByRole("link", { name: "Weekend", exact: true }).first();
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});

test("personalized weekend remains the entry point after reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-specific entry contract.");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "This weekend" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "This weekend" })).toBeVisible();
  await expect(page.getByText(/Friday 12:19/)).toBeVisible();
});
