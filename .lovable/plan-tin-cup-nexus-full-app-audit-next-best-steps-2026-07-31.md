# Tin Cup Nexus — Full App Audit & Next Best Steps

A file-by-file pass over routes, hooks, components and the database. Findings are ordered by what would actually break or frustrate on tournament weekend.

## What's solid today

- Clean route split (`/`, `/schedule`, `/rosters`, `/purse`, `/scout`, `/profile`, `/captain`) with per-route metadata.
- Live data layer with realtime on matches and side bets, plus a localStorage cache so the board still renders with weak signal.
- Database is correctly seeded: 2 teams, 16 players, 3 rounds, 23 matches totalling exactly 26 points, 8 side bets. Access rules use the hardened private helper functions.

## Critical — will break on event day

1. **Nobody can actually score.** The roles table has zero rows, so scoring permission is false for every account: the captain input button never appears and match updates would be rejected. Needs a first-admin bootstrap plus a small admin screen to grant captain access to the two captains.
2. **Writes have no offline safety.** Innisbrook has dead spots. A failed match update today shows a toast and the entry is lost. Add optimistic updates plus a retry queue that replays pending writes when the connection returns.
3. **No service worker.** There is a manifest but no offline shell, so a cold load with no signal shows nothing.
4. **Score entry is slow under pressure.** The modal lists all 23 matches in one flat scroll with no round filter, no current-round default, no confirmation and no undo. A mis-tap silently changes the cup score.

## Reliability and correctness

5. **Auth is duplicated per component.** Every Shell and page calls `useAuth` independently, each opening its own session listener and role query. Consolidate into one provider exposing `loading` so captain controls stop flickering.
6. **Two different sign-in implementations** (`/captain` inline form and `AuthCard`). Keep `AuthCard` only.
7. **No error or empty states.** When the fetch fails, panels render `?? []` — a blank 0–0 board that looks like real data. Add loading skeletons, an error state with retry, and a "showing cached data" indicator with last-synced time.
8. **Mode never re-evaluates.** The pre/live/post default runs once on mount; an app left open through Friday's first tee stays on Pre. Re-check on an interval and on tab focus, remembering a manual override for the session.
9. **Purse figures are hardcoded prose.** Side cash reads 6 CTP x $93 + 2 LD x $120 = $798 against a $50 x 16 = $800 pool. Derive purse totals from the side-bet rows so numbers can't drift, and reconcile the $2.
10. **No 404 route and no route-level error boundaries.** One bad fetch can blank a page.

## Section-by-section improvements

- **Leaderboard (home):** per-round point subtotals and a clinch line (who needs what to reach 13.5); mark the round in progress; show last-updated time.
- **Live board:** show actual pairings on each match, not just a label; compact lead/all-square indicator per round.
- **Schedule:** "now / next" highlight, per-round tee countdown, meals inline.
- **Rosters:** link each player to their claimed profile, captain badges, side-bet wins next to names.
- **Purse:** live-computed payouts showing each player currently owed or owing, driven by standings.
- **Scout:** cache hole maps offline, allow a captain-shared team game plan alongside private notes, add per-hole yardage/par summary.
- **Hall of Fame:** the photo vault has zero rows and no realtime; add upload progress, thumbnails, realtime refresh, and store trophy winners in the database instead of static copy.

## Polish

- Accessible labels on all modal inputs, larger bottom-nav tap targets, focus-visible rings matching the gold system.
- A lightweight test pass over the scoring math (halved matches, totals, clinch threshold) — the one piece of logic where an error is invisible.

## Suggested order

1. Roles bootstrap + admin screen (unblocks scoring).
2. Score entry rework: round-scoped, confirm, undo, optimistic.
3. Offline: service worker + write queue + cached/last-synced indicator.
4. Auth consolidation, error/empty states, 404 and error boundaries.
5. Data-driven purse and clinch logic + tests.
6. Section-level content upgrades (pairings, now/next, roster links, photo vault).

## Technical notes

- `useAuth` becomes a context provider mounted in `__root.tsx`; Shell and pages consume it.
- The write queue sits beside `useTournament`, persisting pending mutations to localStorage and flushing on `online` and realtime reconnect.
- Roles are granted through an admin-only screen writing to the roles table; the first admin is seeded by a migration keyed to the owner's email.
- Service worker registered from `__root.tsx`, caching the app shell and assets only — tournament data keeps using the existing localStorage cache.
