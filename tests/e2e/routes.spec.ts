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
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText(/Friday · South/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /12:19/ })).toBeVisible();
  await expect(page.getByText("Where the vibes are high and the divots are deep")).toHaveCount(0);
  await expect(page.getByText(/12:19 PM/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekend", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Pay \$150/ }).first()).toBeVisible();
  await expect(page.getByText(/Fri 8 \+ Sat 6 \+ Sun 12/)).toHaveCount(0);
  await expect(page.getByText("Sign in to join the Clubhouse")).toHaveCount(0);
  await expect(page.getByText("Today at Tin Cup")).toHaveCount(0);
  expect((await logoRequest).ok()).toBe(true);
  await expect(page.getByRole("button", { name: "Captain score input" })).toHaveCount(0);
  await expect(page.getByText("Days", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Secs", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Share weekend" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Field" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Updates" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Faceoff" })).toBeVisible();
  await expect(page.getByText("Ride the other groups. Yours is already set.")).toHaveCount(0);
  await expect(page.getByText("Side A", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Take", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Sign in to pick a side/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add your face" })).toHaveCount(0);
  await expect(page.getByText("Add to Home Screen", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in to post" })).toBeVisible();
  await expect(page.getByText("August 28–30, 2026", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Skip intro")).toHaveCount(0);
  await expect(page.getByText("Just looking")).toHaveCount(0);
  await expect(page.getByText("Welcome to the weekend")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("weekend is not covered by a first-run welcome sheet", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("tc-seat-v1");
  });
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /^South$/ })).toBeVisible();
  await expect(page.getByText("Just looking")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "I'm in the field" })).toHaveCount(0);
});

test("social-first Home preserves feed filters, deep links, and board compatibility", async ({
  page,
}) => {
  await page.goto("/?feed=photos");
  await expect(page.getByRole("heading", { name: /12:19/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Around the weekend" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/?board=true&feed=photos&post=photo%3Ademo");
  await expect(page).toHaveURL(/board=true/);
  await expect(page.getByRole("link", { name: "Exit display" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Tin Cup 2026 · Live")).toBeVisible();
});

test("weekend, scout and purse retain confirmed source-of-truth details", async ({ page }) => {
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /^South$/ })).toBeVisible();
  await expect(page.getByText("Just looking")).toHaveCount(0);
  await expect(page.getByText("Welcome to the weekend")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Calendar" })).toBeVisible();
  await expect(page.getByText("How formats work", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Scramble \+ Modified Alt Shot/ }),
  ).toBeVisible();
  await expect(page.getByText("Zack · Chris")).toBeVisible();
  await expect(page.getByText("Charles · Blake")).toBeVisible();
  await expect(page.getByRole("button", { name: /Take / })).toHaveCount(0);
  await expect(page.getByText("Side A", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Saturday" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sunday" })).toBeVisible();
  await page.getByRole("tab", { name: "Saturday" }).click();
  await expect(page.getByRole("heading", { name: /^Copperhead$/ })).toBeVisible();
  await expect(page.getByText("Breakfast · Steakhouse 7:00")).toBeVisible();
  await expect(page.getByText("Breakfast · golf")).toHaveCount(0);
  await expect(page.getByText("Pairings posted Friday night.")).toBeVisible();
  await expect(page.getByText("Pool & Salamander Grille")).toHaveCount(0);
  await expect(page.getByText(/scramble partner/i)).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("tab", { name: "Sunday" }).click();
  await expect(page.getByRole("heading", { name: /^Island$/ })).toBeVisible();
  await expect(page.getByText("Breakfast · lunch and awards")).toBeVisible();
  await page.getByRole("button", { name: /Shamble \+ Singles/ }).click();
  await expect(page.getByRole("heading", { name: "Weekend formats" })).toBeVisible();

  await page.goto("/rosters");
  await expect(page.getByRole("tab", { name: "Strong Mental" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Grass Roots" })).toBeVisible();
  await expect(page.getByText("Zack", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Kevin", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Grass Roots" }).click();
  await expect(page.getByRole("tab", { name: "Grass Roots" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("Charles", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Strong Mental" })).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/scout");
  await expect(page.getByRole("heading", { name: /^South$/ })).toBeVisible();
  await expect(page.getByText("Scramble first nine mindset")).toBeVisible();
  await expect(page.getByRole("link", { name: "Plan hole 1", exact: true }).first()).toBeVisible();
  await expect(page.getByText("335 yds").first()).toBeVisible();
  await expect(page.getByText("Out", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("In", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("CTP", { exact: true })).toHaveCount(2);
  await expect(page.getByText("LD", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Target/i })).toHaveCount(0);
  await page.getByRole("tab", { name: /Copperhead/i }).click();
  await expect(page.getByRole("heading", { name: /^Copperhead$/ })).toBeVisible();
  await page.getByRole("tab", { name: /Island/i }).click();
  await expect(page.getByRole("heading", { name: /^Island$/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/purse");
  const payment = page.getByRole("link", { name: /Pay \$150/ }).first();
  await expect(payment).toHaveAttribute("href", /https:\/\/venmo\.com\/Kmaher.*amount=150/);
  await expect(page.getByText("$800").first()).toBeVisible();
  await expect(page.getByText("Team match stake")).toBeVisible();
  await expect(page.getByRole("link", { name: "Weekend formats" })).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByText("$100", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Open · Hole 3")).toBeVisible();
  await expect(page.getByText("Open · Hole 18")).toBeVisible();
  await expect(page.getByText("Open · Hole 7")).toBeVisible();
  await expect(page.getByText("Named Friday night").first()).toBeVisible();
  await expect(page.getByText("$100").nth(1)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("$93");
  await expect(page.locator("main")).not.toContainText("$120");
  await expect(page.locator("main")).not.toContainText("Contest payouts are TBD.");
  await expectNoHorizontalOverflow(page);
});

test("plan hole map opens the 2D theater and pages holes", async ({ page }) => {
  await page.goto("/scout?course=south&card=true");
  await expect(page.getByRole("heading", { name: /^South$/ })).toBeVisible();
  const holeMap = page.getByRole("link", { name: "Open hole 7 map" });
  await holeMap.scrollIntoViewIfNeeded();
  await holeMap.click();
  await expect(page).toHaveURL(/course=south/);
  await expect(page).toHaveURL(/hole=7/);
  await expect(page).toHaveURL(/map=true/);
  await expect(page.getByRole("img", { name: /Schematic layout of hole 7/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".hud-label").filter({ hasText: /^F$/ })).toBeVisible();
  await expect(page.locator(".hud-label").filter({ hasText: /^C$/ })).toBeVisible();
  await expect(page.locator(".hud-label").filter({ hasText: /^B$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to scorecard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hole 1", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Next hole" }).click();
  await expect(page).toHaveURL(/hole=8/);
  await expect(page.getByRole("img", { name: /Schematic layout of hole 8/i })).toBeVisible();
  await page.getByRole("link", { name: "Back to scorecard" }).click();
  await expect(page).toHaveURL(/card=true/);
  await expect(page.getByRole("heading", { name: /^South$/ })).toBeVisible();
});

test("protected preview exposes the gallery and engagement prompt without production writes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Protected preview", { exact: false })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByRole("heading", { name: /12:19/ })).toBeVisible();
  await expect(page.getByText("First-tee faces")).toHaveCount(0);
  await expect(page.getByText("Who holes the first walk-off putt?")).toHaveCount(0);
  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: "Photos" })).toBeVisible();
  await expect(page.getByText("Photos land here after someone posts.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Download shown/ })).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("profile guest sees sign-in instead of a stuck claim screen", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paper" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Night" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claim your name" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Couldn't load your account" })).toHaveCount(0);
});

test("guest account and primary navigation meet the interaction baseline", async ({ page }) => {
  await page.goto("/profile");
  await expectTinCupIdentity(page);
  await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
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
