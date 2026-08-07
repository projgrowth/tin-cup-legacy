import { chromium, devices } from '@playwright/test';

const BASE = 'https://tincupinv.com';
const EMAIL = 'Dan@projgrowth.com';
const PASS = 'Password123';

const results = [];
function log(area, ok, detail) {
  results.push({ area, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${area} | ${detail}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    // clear storage for clean auth test
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  // --- Public routes ---
  const routes = [
    ['/', /weekend|live|tin cup|today/i],
    ['/schedule', /weekend|day 1|pairings|friday|south/i],
    ['/scout', /course|ground|south|copperhead|island|hole/i],
    ['/rosters', /team|strong|grass|roster|field/i],
    ['/purse', /pay|150|purse|venmo|kmaher/i],
    ['/profile', /sign|profile|account|email|password/i],
    ['/captain', /captain|sign|score/i],
    ['/admin', /access|sign|admin|permission/i],
    ['/ops', /ops|sign|readiness|weekend/i],
  ];

  for (const [path, re] of routes) {
    try {
      const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      const text = await page.locator('#main-content').innerText();
      const bodyOk = re.test(text);
      log(`GET ${path}`, status >= 200 && status < 400 && bodyOk, `HTTP ${status}, content match=${bodyOk}`);
    } catch (e) {
      log(`GET ${path}`, false, String(e.message || e));
    }
  }

  // --- Bottom nav labels ---
  await page.goto(BASE + '/');
  await page.waitForTimeout(800);
  for (const label of ['Live', 'Day', 'Map', 'Teams', 'Pay']) {
    const link = page.getByRole('link', { name: label, exact: true });
    const n = await link.count();
    log(`Nav: ${label}`, n >= 1, `count=${n}`);
    if (n >= 1) {
      try {
        await link.first().click();
        await page.waitForTimeout(500);
        log(`Nav click: ${label}`, true, `url=${page.url()}`);
      } catch (e) {
        log(`Nav click: ${label}`, false, String(e.message || e));
      }
    }
  }

  // --- Key CTAs on home ---
  await page.goto(BASE + '/');
  await page.waitForTimeout(1000);
  // Skip intro if present
  const skip = page.getByRole('button', { name: /skip intro/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  for (const name of [/pay \$150/i, /day 1|pairings|schedule/i]) {
    const el = page.getByText(name).first();
    log(`Home text: ${name}`, await el.count() > 0, await el.count() > 0 ? 'found' : 'missing');
  }

  // --- Schedule pairings ---
  await page.goto(BASE + '/schedule');
  await page.waitForTimeout(800);
  for (const t of ['Zack / Chris', 'Charles / Blake', 'Kevin / Max', 'Seth / Keenan']) {
    log(`Pairing: ${t}`, await page.getByText(t).count() > 0, 'visible');
  }

  // --- Purse ---
  await page.goto(BASE + '/purse');
  await page.waitForTimeout(800);
  const pay = page.getByRole('link', { name: /pay \$150/i }).first();
  log('Purse Pay link', await pay.count() > 0, await pay.count() ? await pay.getAttribute('href') : 'none');
  log('Purse $100 pots', await page.getByText('$100').count() > 0, 'at least one $100');
  log('Hole TBD', await page.getByText('Hole TBD').count() > 0, 'visible');

  // --- Scout ---
  await page.goto(BASE + '/scout');
  await page.waitForTimeout(800);
  log('Scout Black yards', await page.getByText(/Black ·/i).count() > 0, 'Black chip');
  for (const course of ['South', 'Copperhead', 'Island']) {
    const tab = page.getByRole('tab', { name: new RegExp(course, 'i') }).or(page.getByRole('button', { name: new RegExp(`^${course}`, 'i') }));
    if (await tab.count()) {
      await tab.first().click().catch(() => {});
      await page.waitForTimeout(300);
      log(`Scout course ${course}`, true, 'clicked');
    } else {
      log(`Scout course ${course}`, false, 'control not found');
    }
  }

  // --- Header account entry ---
  await page.goto(BASE + '/');
  await page.waitForTimeout(500);
  const avatar = page.getByRole('link', { name: /sign in|player profile|your player/i }).or(page.locator('header a[href*="captain"], header a[href*="profile"]').first());
  const headerLinks = await page.locator('header a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  log('Header links', true, JSON.stringify(headerLinks));

  // --- Auth: try sign in, if fail try sign up ---
  await page.goto(BASE + '/profile');
  await page.waitForTimeout(1000);

  async function fillAuth(modeCreate) {
    if (modeCreate) {
      const need = page.getByRole('button', { name: /need an account/i });
      if (await need.count()) await need.click();
      await page.waitForTimeout(300);
    } else {
      const already = page.getByRole('button', { name: /already have one/i });
      if (await already.count()) await already.click();
      await page.waitForTimeout(300);
    }
    await page.getByPlaceholder('Email').fill(EMAIL);
    await page.getByPlaceholder('Password').fill(PASS);
    await page.getByRole('button', { name: modeCreate ? /create account/i : /sign in/i }).click();
    await page.waitForTimeout(4000);
  }

  // Sign in first
  await fillAuth(false);
  let signedIn = await page.getByText(/identity|display name|sign out|signed in/i).count() > 0;
  let authDetail = signedIn ? 'signed in' : await page.locator('body').innerText().then(t => t.slice(0, 400));

  if (!signedIn) {
    // try create
    await page.goto(BASE + '/profile');
    await page.waitForTimeout(800);
    await fillAuth(true);
    signedIn = await page.getByText(/identity|display name|sign out|check your email|signed in/i).count() > 0;
    authDetail = signedIn
      ? (await page.getByText(/check your email/i).count() ? 'signup pending email confirm' : 'signed in after signup')
      : await page.locator('body').innerText().then(t => t.slice(0, 500));
  }

  // If still not, try sign in again after signup
  if (!signedIn || /check your email/i.test(authDetail)) {
    await page.goto(BASE + '/profile');
    await page.waitForTimeout(800);
    await fillAuth(false);
    signedIn = await page.getByText(/identity|display name|sign out|save profile/i).count() > 0;
    authDetail = signedIn ? 'signed in on retry' : await page.locator('body').innerText().then(t => t.slice(0, 500));
  }

  log('Auth session', signedIn, authDetail.replace(/\s+/g, ' ').slice(0, 200));

  if (signedIn) {
    // Profile actions
    log('Save profile button', await page.getByRole('button', { name: /save profile/i }).count() > 0, 'present');
    log('Sign out button', await page.getByRole('button', { name: /sign out/i }).count() > 0, 'present');
    // Try claim Dan Rodriguez if in roster
    const select = page.locator('select').first();
    if (await select.count()) {
      const options = await select.locator('option').allTextContents();
      log('Roster options', options.length > 1, `${options.length} options: ${options.slice(0, 5).join(' | ')}`);
      const dan = options.findIndex(o => /dan/i.test(o));
      if (dan >= 0) {
        await select.selectOption({ index: dan });
        await page.getByRole('button', { name: /save profile/i }).click();
        await page.waitForTimeout(1500);
        log('Claim Dan', true, 'selected and saved');
      }
    }
    // Visit scout signed in
    await page.goto(BASE + '/scout');
    await page.waitForTimeout(1000);
    log('Scout signed-in journal', await page.getByText(/game plan|club off|private/i).count() > 0, 'journal UI');
    // Visit captain page signed in
    await page.goto(BASE + '/captain');
    await page.waitForTimeout(800);
    const captText = await page.locator('main').innerText();
    log('Captain after auth', /signed in|score|captain|admin|no score/i.test(captText), captText.slice(0, 180).replace(/\s+/g, ' '));
  }

  // --- Broken link scan on key pages ---
  for (const path of ['/', '/schedule', '/scout', '/rosters', '/purse', '/profile']) {
    await page.goto(BASE + path);
    await page.waitForTimeout(600);
    const hrefs = await page.locator('a[href]').evaluateAll(as =>
      as.map(a => a.getAttribute('href')).filter(Boolean)
    );
    const internal = [...new Set(hrefs.filter(h => h.startsWith('/') && !h.startsWith('//')))];
    for (const href of internal) {
      if (href.includes('$') || href.includes(':')) continue;
      try {
        const r = await page.request.get(BASE + href.split('?')[0], { maxRedirects: 5 });
        const st = r.status();
        if (st >= 400) log(`Link ${path}→${href}`, false, `HTTP ${st}`);
      } catch (e) {
        log(`Link ${path}→${href}`, false, String(e.message || e));
      }
    }
  }

  await browser.close();

  const fail = results.filter(r => !r.ok);
  const pass = results.filter(r => r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(`PASS ${pass.length}  FAIL ${fail.length}`);
  if (fail.length) {
    console.log('FAILURES:');
    for (const f of fail) console.log(` - ${f.area}: ${f.detail}`);
  }
  process.exit(fail.length ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
