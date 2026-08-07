# Luna implementation brief — tournament feedback and mobile-first cleanup

## Objective

Correct the tournament rules and setup model, then simplify the app around the three things players need on a phone: what is happening next, the live Cup score, and the action they need to take. Preserve the existing Nhost auth, live updates, offline queue, conflict detection, course maps, and visual identity.

This is a forward-only change. Do not rewrite old migrations or published history. Do not guess missing tournament facts.

## Confirmed product decisions

- Field size remains 16 players.
- Countdown displays **Days / Hours / Minutes** only. Remove seconds everywhere.
- Captains choose **match pairings**, not contest or playoff holes.
- CTP and Long Drive hole assignments are **TBD** until the organizer confirms them.
- CTP and Long Drive dollar amounts must change, but the replacement values have not yet been supplied. Keep them as explicit configuration blockers; never invent amounts.
- Buy-in remains $150 and the tournament bank remains Kevin Maher / Venmo `@Kmaher` unless separately changed.

## Product model to enforce

Separate organizer configuration from captain scoring:

- Admin/organizer owns side-bet kind, label, round, amount, and optional hole.
- Captains own pairings, match results, side-bet winner, and optional winning distance.
- Captains must not be able to edit a side-bet hole or payout while posting a claim.
- The database/API must enforce this with column-level permissions; hiding a field in React is not sufficient.

## Phase 0 — amount preflight

Before changing production side-bet amounts, obtain two authoritative values:

- `CTP_AMOUNT = [REQUIRED]`
- `LONG_DRIVE_AMOUNT = [REQUIRED]`

Also confirm whether all six CTPs share one amount and both Long Drives share one amount. If no answer is available, complete all other work, render the amount as **TBD**, and do not run a destructive or guessed money migration.

## Phase 1 — correctness and source of truth

### Countdown

Update both countdown surfaces, not just the home component:

- `src/components/tin-cup/Countdown.tsx`: remove `seconds`, change the interval from one second to one minute, render a three-column grid, and spell out `Minutes`.
- `src/routes/schedule.tsx`: replace large raw-hour strings such as `T-minus 591h 59m` with a shared formatter that emits `24 days · 15 hours · 59 minutes` and naturally omits zero units.
- Put the formatter in a tested pure utility so home and schedule cannot drift.
- After kickoff, show `The cup is live` or the existing live state instead of zeroed countdown cells.

### Side cash and TBD holes

Create a new forward migration against the Nhost/Postgres database. Do not edit the historical seed migration.

- Set every 2026 `side_bets.hole` to `NULL` until confirmed.
- Replace labels containing invented hole numbers with stable labels:
  - `South CTP 1`, `South CTP 2`
  - `Copperhead CTP 1`, `Copperhead CTP 2`
  - `Island CTP 1`, `Island CTP 2`
  - `Friday Long Drive`, `Saturday Long Drive`
- Apply the confirmed new dollar values only after Phase 0 is resolved.
- Add an admin-only configuration path for `label`, `round_id`, `hole`, and `amount` if one does not exist.
- Restrict captain updates on `side_bets` to `player_name`, `team_slug`, `distance`, `revision`, and `updated_at` as required by the write path.
- Keep public read access for the live board.

Update every dependent surface:

- `src/routes/purse.tsx`: render `Hole TBD` when `hole` is null; never suppress the line and leave users guessing.
- `src/components/tin-cup/live/LivePanel.tsx`, `src/components/tin-cup/live/MatchControls.tsx`, and `src/components/tin-cup/ScoreModal.tsx`: show TBD consistently.
- Remove the editable `Hole #` field and the `hole` mutation from both captain claim flows.
- `src/lib/tin-cup.ts`: remove hard-coded `$93 × 6`, `$120 × 2`, and any stale payout prose. Prefer values derived from live rows.
- `src/lib/purse.ts`: stop deriving group headings from free-form labels. Group by normalized kind and use `Closest to the Pin` / `Long Drive`. This fixes headings such as `CTP - South No.` and `Long Drive - Friday` being used as category names.
- Reconcile the side-cash pool. The current board shows `$800 pool`, `$798 posted`, and `$2 unallocated`. After confirmed amounts are entered, the page must either balance exactly or label the remainder as an intentional reserve with organizer-approved copy.
- Update page metadata and tests that still advertise the old values.

### Captains choose pairings

- Replace the incorrect playoff copy in `src/routes/schedule.tsx`, `src/lib/tin-cup.ts`, and the purse rules. Use: `13–13 tie → one-hole scramble playoff. Playoff hole TBD.`
- Add a visible note to each round/format: `Pairings set by team captains.`
- Make the roster-tap `MatchPairingEditor` the only pairing editor. Remove or refactor the duplicate free-form `side_a` / `side_b` inputs in `ScoreModal`.
- Pairing validation must prevent the same player appearing on both sides and prevent a player from being assigned to the wrong team. Do not enforce a guessed group size because the formats differ.
- Show the saved pairing directly beneath each match and on the player profile.
- Keep optimistic concurrency and the offline queue for pairing writes.

## Phase 2 — captain workflow redesign

Make captain actions usable one-handed under course conditions:

1. Captain opens **Live**.
2. Selects the round and match.
3. Taps players from the two team rosters to set/edit pairings.
4. Posts a result with one large action.
5. For CTP/Long Drive, selects the configured contest, winner, and optional distance—never a hole or amount.
6. Sees one of three unmistakable states: `Saved`, `Saved offline`, or `Needs attention`.

Implementation guidance:

- Consolidate duplicated write logic between `ScoreModal.tsx` and `live/MatchControls.tsx` into shared hooks/components.
- Prefer a bottom sheet on phones instead of a small centered dialog.
- Keep primary controls at least 44×44 CSS pixels.
- Put the current match name, teams, and points above the confirmation button so a captain cannot post to the wrong row.
- Preserve the undo action, failed-write list, conflict detection, and retry behavior.

## Phase 3 — mobile-first UI hierarchy

### Global shell and navigation

- Keep the five-item bottom navigation; it is the right tournament-day model.
- Increase the header profile/sign-in control from 32px to at least 44px.
- Reduce the shell's excess bottom padding while retaining safe-area clearance and room for the captain action button.
- Use one consistent page rhythm: 20px side gutters, 24px section gaps, 12–16px card gaps, and 44px controls.
- Keep gold for primary/action/active states and copper for secondary team or warning states. Avoid using both merely as decoration in the same card.

### Home / leaderboard

- Remove the duplicate above-the-fold hero. `Today at Tin Cup` and `The weekend starts here` currently compete for priority.
- Before the event, lead with countdown + next tee + payment/setup action.
- During the event, lead with Cup score + current round + unresolved matches.
- After the event, lead with final score + winners + photos/trophies.
- Keep Weekend / Live / Legacy available, but make the active event state visually primary and reduce the inactive modes to a compact segmented control.
- Replace the hard-coded `Players: 16` UI value with the configured expected count or loaded roster count.

### Schedule

- Use the new days/hours/minutes formatter.
- Keep round cards concise by default: day, course, tee time, format, points, and pairing status.
- Move dinner and detailed format breakdown into an expandable `Details` section on phones.
- Keep the social itinerary below golf information.

### Scout

- Preserve the maps and official-course links; they are a strong differentiator.
- Increase 36px hole chips and small Previous/Next buttons to 44px targets.
- On phones, keep course tabs and the current-hole controls sticky beneath the header while the map/content scrolls.
- Distinguish `course hole` from `contest hole`: course exploration remains available for holes 1–18, while CTP/Long Drive assignments say TBD.
- Replace the full inline sign-in form with a compact `Sign in to save notes` card that opens the shared auth flow. The current form dominates the scout experience for signed-out players.
- Keep the `not GPS` disclaimer visible but shorten it to one line where possible.

### Purse

- Reduce repetition between `Your entry`, `Side Cash Board`, `Every posted pot`, and `Where the money goes`.
- Recommended mobile order: payment card → three-number summary → contest ledger → collapsible rules.
- Render each contest row as: contest name, `Hole TBD`, status/winner, and amount/TBD.
- Hide admin/ops links behind the signed-in profile or a small organizer menu instead of placing implementation links in the player-facing money flow.

### Rosters and player cards

- Keep the two-team rail treatment and player record shorthand.
- Add a clear `Pairing TBD` / next pairing summary to player pages.
- Replace the captain `C` pill with an accessible `Captain` label at least on the player detail screen.
- Do not let side-cash winnings overpower match status before the tournament starts.

### Captain, profile, admin, and ops

- Treat these as one signed-in organizer area with consistent navigation and status messaging.
- Surface role-fetch errors and a retry action on the captain/profile screens.
- Keep `/ops` out of player navigation, but make the pre-event checklist easy for organizers to find.
- Remove obsolete Supabase/Lovable runtime clients only after confirming no current imports depend on them. Keep generated table types if still used, or replace them with Nhost-domain types before removing the dependency.

## Accessibility and responsive acceptance criteria

- Test at 360×800, 390×844, 430×932, 768×1024, and desktop.
- No horizontal page overflow; horizontal scrolling is allowed only in clearly indicated chip strips.
- Every actionable control is at least 44×44 on phones.
- Bottom navigation never covers the last content or fixed captain action.
- Selected states use more than color (`aria-pressed`, text/icon, border, or checkmark).
- Focus is visible; drawers/dialogs trap and restore focus.
- `prefers-reduced-motion` remains respected.
- Text remains readable at 200% zoom without clipped controls.

## Tests to add or update

- Unit: countdown returns only days/hours/minutes and handles kickoff/past dates.
- Unit: purse grouping uses canonical kind labels and supports null holes/amounts.
- Unit: side-cash math either balances or explicitly reports a configured reserve.
- Unit: pairing validation rejects duplicates and cross-team assignments.
- E2E public mobile: home, schedule, scout, purse, rosters, and player detail have no overflow or nav overlap.
- E2E captain mobile: set pairing, post result, log CTP/LD winner without a hole field.
- E2E offline: pairing/result queued, visible as pending, then synced.
- E2E conflict: two captain contexts edit one match; second device receives a conflict and server truth remains visible.
- Authorization: public cannot mutate; player cannot mutate; captain can update only scoring columns; admin can configure contests.

## Definition of done

- No UI or metadata mentions seconds in a countdown.
- No schedule countdown displays hundreds of raw hours.
- No UI says captains choose a hole.
- Captains choose pairings from rosters and cannot edit contest hole or payout.
- Every unconfirmed CTP/LD assignment displays `Hole TBD`.
- Old $93/$120 values are gone only after authoritative replacements are supplied.
- The side-cash board no longer shows an unexplained imbalance.
- No malformed category headings remain.
- All unit, type, lint, production build, mobile E2E, offline, conflict, and authorization tests pass.
- Production smoke test returns 200 for every public route and reports no runtime errors after deployment.

## Required handoff

When complete, report:

- the final CTP and Long Drive values used and their source;
- the migration name and whether it was applied to Nhost production;
- the permission changes;
- screenshots at 390×844 for Home, Live captain input, Scout, and Purse;
- test/build results;
- any tournament fact still displayed as TBD.
