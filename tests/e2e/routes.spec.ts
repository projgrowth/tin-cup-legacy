import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Durable skip — matches production markIntroSeen shape.
    localStorage.setItem("tc-intro-v1", JSON.stringify({ seenAt: Date.now(), version: 1 }));
    localStorage.setItem("tc-seat-v1", "guest");
    sessionStorage.setItem("tc-intro-played", "1");
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
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
  const mast = await page.evaluate(() => {
    const crest = document.querySelector('img[alt="The Tin Cup Invitational"]');
    const time = document.querySelector("main h1");
    const pay = document.querySelector('main a[href*="venmo.com"]');
    const faceoff = document.getElementById("the-card-title");
    const timeBox = time?.getBoundingClientRect();
    const payBox = pay?.getBoundingClientRect();
    return {
      crest: Math.round(crest?.getBoundingClientRect().left ?? -1),
      time: Math.round(timeBox?.left ?? -1),
      timeRight: Math.round(timeBox?.right ?? -1),
      timeTop: Math.round(timeBox?.top ?? -1),
      timeBottom: Math.round(timeBox?.bottom ?? -1),
      pay: Math.round(payBox?.left ?? -1),
      payRight: Math.round(payBox?.right ?? -1),
      payTop: Math.round(payBox?.top ?? -1),
      payBottom: Math.round(payBox?.bottom ?? -1),
      faceoff: Math.round(faceoff?.getBoundingClientRect().left ?? -1),
      vw: window.innerWidth,
    };
  });
  expect(mast.time).toBe(mast.crest);
  expect(mast.pay).toBeGreaterThan(mast.timeRight);
  expect(mast.payTop).toBeLessThan(mast.timeBottom);
  expect(mast.vw - mast.payRight).toBeGreaterThanOrEqual(12);
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
  await expect(page.getByText("Zack · Chris")).toBeVisible();
  await expect(page.getByText("Nick · Andrew")).toBeVisible();
  await expect(page.getByText("Kevin · Max")).toBeVisible();
  await expect(page.getByText("Seth · Keenan")).toBeVisible();
  await expect(page.getByText("2 more")).toHaveCount(0);
  await expect(page.getByText("Add a line")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Most likely" })).toBeVisible();
  await expect(page.getByText("Sign in to vote.")).toBeVisible();
  await expect(page.getByText("3-putt the first hole").first()).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Fall apart mentally before friday is over" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Show up to the first tee box late" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Fall apart", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Show up", exact: true })).toHaveCount(0);
  await expect(page.getByText(/with Zack/)).toHaveCount(0);
  await expect(page.getByText("First tee ·")).toHaveCount(0);
  await expect(page.getByText("to 3-putt the first hole")).toHaveCount(0);
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
  await expect(page.getByLabel("View tournament phase")).toHaveCount(0);
  await expect(page.getByText("Auto ·")).toHaveCount(0);
  await expect(page.getByText("Viewing ·")).toHaveCount(0);
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
  await expect(page.getByText("Where to be")).toBeVisible();
  await expect(page.getByText("Pool & Salamander Grille")).toBeVisible();
  await expect(page.getByText("Zack · Chris")).toHaveCount(0);
  await expect(page.getByText("Charles · Blake")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Take / })).toHaveCount(0);
  await expect(page.getByText("Side A", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Saturday" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Sunday" })).toBeVisible();
  await page.getByRole("tab", { name: "Saturday" }).click();
  await expect(page.getByRole("heading", { name: /^Copperhead$/ })).toBeVisible();
  await expect(page.getByText("Breakfast, free time & Steakhouse")).toBeVisible();
  await expect(page.getByText("Breakfast · Steakhouse 7:00")).toHaveCount(0);
  await expect(page.getByText("Breakfast · golf")).toHaveCount(0);
  await expect(page.getByText("Pairings are on the Home board.")).toBeVisible();
  await expect(page.getByText(/scramble partner/i)).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("tab", { name: "Sunday" }).click();
  await expect(page.getByRole("heading", { name: /^Island$/ })).toBeVisible();
  await expect(page.getByText("Breakfast, lunch & awards")).toBeVisible();
  await expect(page.getByText("Breakfast · lunch and awards")).toHaveCount(0);
  await page.getByRole("button", { name: /Shamble \+ Singles/ }).click();
  await expect(page.getByRole("heading", { name: "Weekend formats" })).toBeVisible();

  await page.goto("/rosters");
  await expect(page.getByRole("tab", { name: "Strong Mental" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Grass Roots" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Strong Mental · 8/ })).toBeVisible();
  await expect(page.getByText("Captain Zack")).toBeVisible();
  await expect(page.getByText("Zack", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("w/ Chris")).toHaveCount(0);
  await expect(page.getByText("Friday with")).toHaveCount(0);
  await expect(page.getByText("Kevin", { exact: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Grass Roots" }).click();
  await expect(page.getByRole("tab", { name: "Grass Roots" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("heading", { name: /Grass Roots · 8/ })).toBeVisible();
  await expect(page.getByText("Captain Charles")).toBeVisible();
  await expect(page.getByText("Charles", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team Strong Mental" })).toHaveCount(0);
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/scout");
  await expect(page.getByRole("tab", { name: "South" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Scramble first nine mindset")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open hole 1 map", exact: true })).toBeVisible();
  await expect(page.getByText("Map hole 1")).toHaveCount(0);
  await expect(page.getByText("335 yds").first()).toBeVisible();
  await expect(page.getByText("Out", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("In", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("CTP", { exact: true })).toHaveCount(2);
  await expect(page.getByText("LD", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Target/i })).toHaveCount(0);
  await page.getByRole("tab", { name: /Copperhead/i }).click();
  await expect(page.getByRole("tab", { name: /Copperhead/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: /Island/i }).click();
  await expect(page.getByRole("tab", { name: /Island/i })).toHaveAttribute("aria-selected", "true");
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
  await expect(page.getByRole("tab", { name: "South" })).toHaveAttribute("aria-selected", "true");
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
  await expect(page.getByRole("tab", { name: "South" })).toHaveAttribute("aria-selected", "true");
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
  await expect(page.getByRole("button", { name: "Paper" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Night" })).toHaveCount(0);
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
