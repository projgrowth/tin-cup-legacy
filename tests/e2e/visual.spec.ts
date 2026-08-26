import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("tc-intro-v1", JSON.stringify({ seenAt: Date.now(), version: 1 }));
    localStorage.setItem("tc-seat-v1", "guest");
    sessionStorage.setItem("tc-intro-played", "1");
    const names = [
      "Zack Smith",
      "Chris Maher",
      "Nick Sears",
      "Andrew Kezsbom",
      "Kevin Maher",
      "Max Furth",
      "Seth Beaver",
      "Keenan Horrell",
      "Charles Grass",
      "Blake Weeks",
      "Neil Candelora",
      "Mike Maher",
      "Dan Rodriguez",
      "Josef Yehia",
      "Casey Gillespie",
      "Barry Rigby",
    ];
    const dare = (id: string, question: string, createdAt: string) => ({
      id,
      authorId: "preview",
      question,
      createdAt,
      closesAt: "2026-08-30T23:59:59-04:00",
      closedAt: null,
      deletedAt: null,
      moderatedBy: null,
      options: names.map((label, sortOrder) => ({
        id: `${id}-${sortOrder}`,
        pollId: id,
        label,
        sortOrder,
      })),
    });
    localStorage.setItem(
      "tin-cup-preview-v1:polls",
      JSON.stringify([
        dare("p-3putt", "Most likely to 3-putt the first hole", "2026-08-25T01:56:08.000Z"),
        dare("p-fall", "Fall apart mentally before friday is over", "2026-08-25T19:15:02.000Z"),
        dare("p-late", "Show up to the first tee box late", "2026-08-26T01:42:20.000Z"),
      ]),
    );
  });
});

test("responsive Home and gallery compose without overflow", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /12:19/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Most likely" })).toBeVisible();
  await expect(page.getByText("Welcome to the Clubhouse")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });

  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible({
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
