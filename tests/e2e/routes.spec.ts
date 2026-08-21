import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Durable skip — matches production markIntroSeen shape.
    localStorage.setItem("tc-intro-v1", JSON.stringify({ seenAt: Date.now(), version: 1 }));
    localStorage.setItem("tc-seat-v1", "guest");
    sessionStorage.setItem("tc-intro-played", "1");
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
  });
});

async function expectTinCupIdentity(page: import("@playwright/test").Page) {
  await expect(page).toHaveTitle(/Tin Cup Invitational/i);
  await expect(page.getByRole("img", { name: "The Tin Cup Invitational" })).toHaveAttribute(
    "src",
    "/tin-cup-logo.png",
  );
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("home loads its local brand and weekend cover", async ({ page }) => {
  const logoRequest = page.waitForResponse((response) =>
    response.url().endsWith("/tin-cup-logo.png"),
  );
  await page.goto("/");
  await expectTinCupIdentity(page);
  await expect(
    page.getByRole("heading", { name: /4th Annual Tin Cup Invitational/i }),
  ).toBeVisible();
  await expect(page.getByText("First tee · Friday 12:19 PM")).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekend", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Sign in to join the Clubhouse")).toHaveCount(0);
  await expect(page.getByText("Today at Tin Cup")).toHaveCount(0);
  expect((await logoRequest).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Captain score input" })).toHaveCount(0);
  await expect(page.getByText("Minutes", { exact: true })).toBeVisible();
  await expect(page.getByText("Secs", { exact: true })).toHaveCount(0);
  const share = page.getByRole("button", { name: "Share weekend" });
  await expect(share).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("social-first Home preserves feed filters, deep links, and board compatibility", async ({
  page,
}) => {
  await page.goto("/?feed=photos");
  await expect(page.getByRole("heading", { name: "Around the weekend" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Photos" })).toHaveAttribute("aria-selected", "true");
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.appearance));
  await page.getByRole("tab", { name: "Results" }).click();
  await expect(page).toHaveURL(/feed=scores/);
  await expect(page.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true");
  await expectNoHorizontalOverflow(page);

  await page.goto("/?board=true&feed=photos&post=photo%3Ademo");
  await expect(page).toHaveURL(/board=true/);
  await expect(page.getByRole("link", { name: "Exit display" })).toBeVisible();
  await expect(page.getByText("Tin Cup 2026 · Live")).toBeVisible();
});

test("weekend, scout and purse retain confirmed source-of-truth details", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /Friday · South/i })).toBeVisible();
  await expect(page.getByText("Zack / Chris")).toBeVisible();
  await expect(page.getByText("Charles / Blake")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/scout");
  await expect(page.getByRole("heading", { name: /South game plan/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Map$/ })).toBeVisible();
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
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 15_000 });
  // Kevin admin: Day 1 CTP 3/18 and LD 13; remaining days stay TBD.
  await expect(page.getByText("$100", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Open · Hole 3")).toBeVisible();
  await expect(page.getByText("Open · Hole 18")).toBeVisible();
  await expect(page.getByText("Open · Hole 13")).toBeVisible();
  await expect(page.getByText("Hole TBD").first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$93");
  await expect(page.locator("main")).not.toContainText("$120");
  await expect(page.locator("main")).not.toContainText("Contest payouts are TBD.");
  await expectNoHorizontalOverflow(page);
});

test("plan hole map opens the 2D theater and pages holes", async ({ page }) => {
  await page.goto("/scout?course=south&card=true");
  await expect(page.getByRole("heading", { name: /South game plan/i })).toBeVisible();
  const holeMap = page.getByRole("link", { name: "Open hole 7 map" });
  await holeMap.scrollIntoViewIfNeeded();
  await holeMap.click();
  await expect(page).toHaveURL(/course=south/);
  await expect(page).toHaveURL(/hole=7/);
  await expect(page).toHaveURL(/map=true/);
  await expect(page.getByRole("img", { name: /Schematic layout of hole 7/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "Scorecard" })).toBeVisible();
  await page.getByRole("link", { name: "Next hole" }).click();
  await expect(page).toHaveURL(/hole=8/);
  await expect(page.getByRole("img", { name: /Schematic layout of hole 8/i })).toBeVisible();
  await page.getByRole("link", { name: "Scorecard" }).click();
  await expect(page).toHaveURL(/card=true/);
  await expect(page.getByRole("heading", { name: /South game plan/i })).toBeVisible();
});

test("protected preview exposes the gallery and engagement prompt without production writes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Protected preview", { exact: false })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole("heading", { name: "Around the weekend" })).toBeVisible();
  await expect(page.getByText("First-tee faces")).toHaveCount(0);
  await expect(page.getByText("Who holes the first walk-off putt?")).toHaveCount(0);
  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: "The camera roll" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Download shown/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("profile guest sees sign-in instead of a stuck claim screen", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /Join the weekend/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claim your name" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Couldn't load your account" })).toHaveCount(0);
});

test("guest account and primary navigation meet the interaction baseline", async ({ page }) => {
  await page.goto("/profile");
  await expectTinCupIdentity(page);
  await expect(page.getByRole("heading", { level: 1, name: "Join the weekend" })).toBeVisible();
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Password")).toBeVisible();

  const undersized = await page.locator("nav a:visible, nav button:visible").evaluateAll(
    (nodes) =>
      nodes.filter((node) => {
        const box = node.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      }).length,
  );
  expect(undersized).toBe(0);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
