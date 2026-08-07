# Tin Cup Invitational — Adaptive Command Center & Scoring Trust

Implementation plan for Luna. This is the next milestone after the August 3 content, branding, PWA and Scout source-of-truth pass.

## Mission

Turn the app from a polished collection of narrow mobile pages into one adaptive tournament command center that is:

- immediately understandable to a player opening it for the first time;
- fast enough for captains to operate between shots;
- useful on phones, tablets and desktop displays;
- trustworthy when two captains score at nearly the same time;
- maintainable by a developer without hunting through route-specific copy and styles.

The product must continue replacing the original tournament deck while also acting as the live leaderboard, course guide, purse, roster, photo archive and event-operations console.

## Confirmed product facts

- 16 players, two teams, three rounds and 26 total Cup points.
- Tournament dates: August 28–30, 2026.
- Tournament bank: Kevin Maher; Venmo `@Kmaher`.
- Buy-in: $150 = $100 team match stake + $50 side-cash pool.
- Tournament tee colors and yardages are not confirmed. Keep them visibly `TBD`; never invent or infer them.
- Course geometry is an offline orientation aid, not GPS.

## Preserve these working systems

Do not replace or regress:

- TanStack Router/Start route structure and SSR setup;
- Supabase authentication and RLS;
- `AuthProvider` and captain/admin role flow;
- persisted offline write queue, failure list and retry behavior;
- realtime invalidation for matches, side bets, trophies and photos;
- PWA generation into `.output/public` (currently 34 precache entries);
- local optimized intro/logo assets and reduced-motion behavior;
- route-level loading, retry, 404 and root error states;
- `/ops` readiness tools and `EVENT_OPS.md`;
- existing scoring/purse unit tests.

Do not introduce a new state-management library. Continue using React Query, route state and the existing external-store queue.

## Why this milestone is next

### User experience findings

1. Every primary route is constrained by `Shell` to `max-w-md` (448px), even on tablets and desktop. This creates large unused areas and prevents the roster, schedule, live board and Scout from using appropriate multi-column layouts.
2. The home tabs `Pre`, `Live` and `Hall of Fame` describe system modes rather than user goals. A player primarily wants to know: what is happening now, what is next, what is the score and what do I need to do?
3. Offline/pending status is most visible inside the Live panel, but captains can create or inspect event data from multiple routes. Sync trust should be global.
4. Schedule, Scout and Purse contain good information but use similar vertical card stacks. The pages need different visual rhythms that reflect their jobs: timeline, course atlas and financial ledger.
5. The app relies heavily on 12px `t-micro` text. Supporting text should generally be at least 13–14px on phones, with 12px reserved for short metadata.

### Developer findings

1. The offline queue prevents silent loss, but writes still use blind `.update().eq("id", rowId)` calls. Two captains can overwrite each other without a conflict signal.
2. There are unit tests but no route-level browser smoke tests or dual-captain conflict test.
3. `npm run lint` currently has one blocking error in `PhotoVault.tsx` (`no-explicit-any`) and seven Fast Refresh warnings.
4. The root Open Graph image still references an old preview-CDN screenshot. Social previews need a stable local asset or final production URL.
5. Google Fonts is loaded from the network even though offline behavior is a core requirement.

## Architecture decisions

### ADR-01: Adaptive shell, route-owned layouts

**Decision:** Keep one shared shell, but replace the universal 448px content constraint with named layout variants.

- `compact`: auth, profile forms, admin and focused utilities; max width about 560px.
- `content`: Weekend Guide, Purse and general editorial pages; max width about 800px.
- `dashboard`: Home, Live, Rosters and Scout; max width about 1120px with route-owned grids.

At widths below 768px, all variants collapse to the current single-column mobile experience. Bottom navigation stays mobile-only; tablet/desktop receives a compact top or side navigation using the same route definitions.

Do not add route-specific arbitrary max-width values after this change. The shell/layout components own width, gutters and responsive behavior.

### ADR-02: Phase-aware home instead of mode-first home

**Decision:** The home route automatically chooses the most relevant state and leads with a `Today at Tin Cup` command center.

The first viewport should answer:

1. What is happening now or next?
2. What is the Cup score?
3. Is my device synced?
4. What is my next useful action?

Keep access to Weekend, Live and Legacy content, but rename the user-facing modes to `Weekend`, `Live` and `Legacy`. Make the automatic phase the primary view; manual mode selection becomes secondary and remains session-scoped.

### ADR-03: Revision-based scoring writes

**Decision:** Add explicit optimistic concurrency to match, side-bet and trophy writes.

- Add a monotonic `revision bigint not null default 0` to writable live tables.
- Increment it on every accepted update.
- Include `expectedRevision` in each queued write.
- Apply the update only when the server revision equals the expected revision.
- A revision mismatch is a conflict, not a retryable transport failure.
- Never silently overwrite newer server data.

On conflict, show the captain both versions and offer:

- `Keep server result` (discard the local write), or
- `Review and reapply` (create a new write against the latest revision after explicit confirmation).

Do not add an automatic “last write wins” fallback.

### ADR-04: Local-first critical assets

**Decision:** Anything required to identify or operate the event must be locally hosted and precached: logo, icons, CSS, critical fonts, app shell and compact course data. External links may enrich the app, but must not be required to use it.

## Delivery phases

## Phase 0 — Quality baseline and scoring integrity

Complete this before large layout work so visual changes do not hide data-integrity regressions.

### 0.1 Make the quality gate fully green

- Fix the explicit `any` in `src/components/tin-cup/PhotoVault.tsx` with a typed upload options adapter or supported Supabase type.
- Move `INTRO_SESSION_KEY` and `introAlreadyPlayed` to `src/lib/intro.ts` so `CinematicIntro.tsx` only exports a component.
- Treat generated/shared UI Fast Refresh warnings deliberately: split exported variants when practical; otherwise add narrowly scoped ESLint exceptions with comments. Do not disable the rule globally.
- Required command: `npm run lint && npm test && npm run typecheck && npm run build`.

### 0.2 Add conflict-safe live writes

Files likely involved:

- new Supabase migration under `supabase/migrations/`;
- `src/integrations/supabase/types.ts`;
- `src/lib/write-queue.ts`;
- `src/lib/write-queue.network.test.ts`;
- `src/hooks/useTournament.ts`;
- scoring controls in `src/components/tin-cup/live/` and `ScoreModal.tsx`.

Requirements:

- Store `expectedRevision` on queued writes.
- Return a typed result: `saved | queued | rejected | conflict`.
- Persist conflicts separately from transport failures so they survive reloads.
- Add a global conflict-resolution UI described in Phase 1.
- Preserve migration from existing queue storage keys; never discard older pending writes during an app upgrade.
- Add tests for two captains updating the same revision, offline replay after a newer server write, conflict dismissal and explicit reapply.

Acceptance criteria:

- Two clients starting from revision 4 cannot both silently commit different results.
- The second client sees a conflict containing the latest server value.
- Normal offline retries still work unchanged.

## Phase 1 — Adaptive shell and global trust UI

### 1.1 Introduce shared layout primitives

Create focused primitives, not a new component framework:

- `AppFrame` or an extended `Shell` with `compact | content | dashboard` variants;
- `PageHeader` with title, eyebrow, optional status and optional primary action;
- `SectionHeader` with consistent title/support/action placement;
- `StatCard` for score/purse/readiness metrics;
- `SyncBanner` for offline, pending, failed and conflict states.

Update primary routes to select a layout variant. Suggested mapping:

- dashboard: `/`, `/scout`, `/rosters`;
- content: `/schedule`, `/purse`, player detail;
- compact: `/profile`, `/captain`, `/admin`, `/ops`.

Desktop behavior:

- use the horizontal space for meaningful secondary content, not stretched text;
- cap long-form reading lines around 65–75 characters;
- keep key actions and status visible without duplicating mobile bottom navigation;
- no horizontal scrolling at 768, 1024 or 1440px.

### 1.2 Global sync and connection state

Place a quiet global status surface in `Shell`:

- hidden when online, clean and recently synced;
- offline: `Offline — showing saved tournament data`;
- queued: exact pending count and “will sync automatically”;
- failed: persistent action to retry;
- conflict: persistent action to review.

Use `aria-live="polite"` for state changes. Do not communicate state by color alone.

### 1.3 Typography and accessibility pass

- Reserve 12px text for timestamps, terse labels and metadata only.
- Use at least 13–14px for explanatory copy and actionable secondary text.
- Ensure all touch targets are at least 44×44 CSS pixels.
- Add a skip-to-content link in the root shell.
- Standardize `:focus-visible` across links, tabs, modal controls and map selectors.
- Verify gold/copper selected states with icon, label or border changes in addition to color.

Acceptance criteria:

- Core pages work at 390×844, 768×1024 and 1440×900.
- Desktop uses at least two meaningful columns on Home, Rosters and Scout.
- Keyboard navigation reaches every primary action in a logical order.

## Phase 2 — Home, Live and Weekend workflows

### 2.1 Rebuild Home as `Today at Tin Cup`

Before the event:

- compact branded hero;
- countdown and first tee;
- next scheduled golf/social event;
- payment status/CTA to `@Kmaher`;
- quick links to Weekend Guide, Rosters and Scout.

During the event:

- Cup score is the visual anchor;
- current round and course;
- next unresolved match count;
- most recent side-cash claim;
- global sync state;
- captain-only primary action: `Post a result`.

After the event:

- champion and final score;
- award winners;
- photo-vault entry point;
- link to the complete match timeline.

Avoid showing all three phases as equally prominent tabs. The current phase is primary; alternate phases live in a compact segmented control or overflow menu.

### 2.2 Make Live fast under pressure

- Put the current round first and expanded.
- Collapse completed and future rounds by default, while keeping their subtotals visible.
- Add a `Needs result` filter for captains.
- Keep pairings, result state and edit action in one match card.
- Maintain confirmation and Undo; add conflict feedback from Phase 0.
- Use a sticky score/remaining-points bar that does not cover content or the bottom navigation.
- Keep the inline result controls as the fastest path; the modal remains a comprehensive fallback.

Target: a captain should post or correct a match result in two deliberate taps from the Live view.

### 2.3 Turn Weekend Guide into a timeline

- Group golf and social events by Friday/Saturday/Sunday.
- Use a vertical time rail on mobile and three day columns on desktop.
- Distinguish `Golf`, `Meal`, `Social` and `Awards` with icon + label, not color alone.
- Add `Add to calendar` by generating a local `.ics` download for confirmed events.
- Do not create exact times for events whose source material does not provide them.
- Replace the database label `Table` in the UI with `After golf` or `Meal` as appropriate.

## Phase 3 — Scout, Rosters, Purse and Legacy

### 3.1 Scout becomes a course atlas

Mobile:

- sticky course switcher and horizontally scrollable hole selector;
- course profile, current hole identity and map above the fold;
- previous/next controls stay reachable near the map;
- journal follows the hole information.

Desktop/tablet:

- two-column atlas: map and hole selector on the left; course facts, source, Snake Pit note and journal on the right;
- changing holes updates the right panel without moving the whole page back to the top.

Reliability constraints:

- keep `Tournament tees and yardages · TBD` until the organizer supplies tee colors;
- do not display the unverified `yards` values from `innisbrook-holes.json` as tournament yardage;
- retain official Innisbrook course links and the “orientation only — not GPS” notice;
- expose a small `Last verified` field when official tee data is eventually added;
- critical geometry and selected-hole state must work offline.

Optional after the core work: add approved course photography or user-owned images. Do not scrape or hotlink copyrighted course imagery.

### 3.2 Rosters use team comparison

- Two team columns at tablet/desktop; stacked teams on mobile.
- Stronger team header with captain, current points and points-to-clinch.
- Make `Claim your spot` a clear one-time onboarding action, not a permanent dominant card after a profile is claimed.
- Player rows show captain badge, W-H-L record, pairing assignment and side-cash wins without becoming visually dense.
- Add search only if the roster may expand beyond the confirmed 16; otherwise keep direct scanning.

### 3.3 Purse becomes a ledger

- Keep the Kevin Maher / `@Kmaher` bank card.
- Separate `Your entry`, `Team payout` and `Side cash` into distinct concepts.
- Lead with reconciliation: $800 pool, $798 posted, $2 unallocated.
- Show open and claimed pots in a compact ledger/table on wider screens.
- Add a plain-language `How the $150 works` disclosure near the payment CTA.
- Never imply the opponent’s $100 is part of the player’s initial $150 payment.

### 3.4 Legacy/Hall of Fame

- Trophy winners should be the visual anchor after the event.
- Show final score and award descriptions before the photo grid.
- Add proper loading, empty and signed-URL failure states to Photo Vault.
- Add upload progress without relying on unsupported options or `any` casts.
- Preserve keyboard lightbox controls and add focus trapping/restoration.

## Phase 4 — Developer experience, test coverage and launch proof

### 4.1 Centralize tournament content

Move static 2026 content into a clearly named content/config layer, for example:

- `src/content/event.ts`;
- `src/content/weekend.ts`;
- `src/content/courses.ts`.

Keep data that changes live in Supabase. Keep confirmed editorial copy, links and TBD fields in typed local config. Avoid duplicating money, dates or course descriptions across routes.

Add a small validation test ensuring:

- player target is 16;
- buy-in components total $150;
- round points total 26;
- side-pot totals reconcile with an explicitly named remainder;
- every external official course link is present;
- tournament tee fields remain nullable/TBD rather than fabricated.

### 4.2 Add browser-level smoke tests

Add a minimal Playwright suite and `test:e2e` script covering:

- home renders without broken logo/video assets;
- Weekend Guide contains all three days and social itinerary;
- Scout switches among South, Copperhead and Island and never renders a tournament yardage while tees are TBD;
- Purse links to `https://venmo.com/Kmaher` with $150;
- spectator cannot see scoring controls;
- captain can open result controls;
- offline queue banner appears and survives reload;
- conflict fixture opens the conflict-resolution UI;
- no horizontal overflow at the three target viewports.

Do not make production tests depend on a mutable live tournament database. Use a seeded local/test project, request interception or injectable repository layer.

### 4.3 Stable metadata and offline fonts

- Replace the preview-CDN `og:image` and `twitter:image` with a stable production URL based on the local brand artwork.
- Bundle the chosen sans/display font files locally or use the existing system stacks; remove critical reliance on Google Fonts.
- Confirm the service worker precaches the font and logo assets.
- Keep the intro video runtime-cached or network-first; do not force the 1.8MB film into the critical shell precache unless performance testing supports it.

### 4.4 Operational proof

Extend `/ops` to show:

- app/build version;
- database connectivity;
- realtime subscription state;
- service-worker version and control state;
- current queue, failed and conflict counts;
- last successful tournament-data sync;
- seed summary: 2 teams, 16 players, 3 rounds, 23+ matches, 8 side pots.

## Required verification after every phase

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

For phases that change interactions or layout, also run the route smoke suite at:

- 390×844 mobile;
- 768×1024 tablet;
- 1440×900 desktop.

Production build acceptance:

- PWA reports a non-zero precache entry count;
- `.output/public/sw.js` exists;
- no broken local logo/poster/video requests;
- no route has horizontal overflow;
- no uncaught browser console errors.

## Luna working instructions

1. Read `AGENTS.md`, this plan and `EVENT_OPS.md` before editing.
2. Inspect the current implementation before acting; older `.lovable` plans contain issues that have already been fixed.
3. Work phase-by-phase. Do not combine the adaptive-shell rewrite and concurrency migration in one unreviewable patch.
4. Preserve existing migrations; add forward-only migrations.
5. Preserve compatibility with persisted queue/cache data through explicit migration logic.
6. Do not invent tee colors, tee yardages, event times, player names, results or award winners.
7. Do not change RLS or service-role boundaries without tests demonstrating spectator, captain and admin behavior.
8. Prefer existing design tokens and shared utilities; add a token/component only when it has at least two consumers.
9. Keep the interface mobile-first, but verify tablet/desktop as first-class experiences.
10. After each phase, summarize changed files, user-visible behavior, database impact, tests run and any remaining launch risk.

## Definition of done

This milestone is complete when:

- a first-time player understands the current event state and next action from the first home viewport;
- captains can score quickly without silent cross-device overwrites;
- mobile, tablet and desktop layouts feel designed rather than merely stretched or centered;
- Weekend, Scout, Rosters, Purse and Legacy each have a layout matched to their job;
- offline/pending/conflict state is visible app-wide;
- lint, unit tests, typecheck, production build and browser smoke tests all pass;
- `/ops` can demonstrate launch readiness without inspecting the database manually.
