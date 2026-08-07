# Tin Cup Nexus — Next Best Improvements

A single pass that fixes the highest-friction event-day problems first, then completes the visual overhaul, then verifies everything.

## Phase 1 — Event-day function (do first)

### 1. Live board empty state & "right now" focus

The live scoreboard currently renders a 0-0 scorebar and empty match list before any results are posted. Replace that with a contextual card that tells visitors what is happening today:

- If the event has not started: countdown to the first tee time and a short "Pre-tournament mode" CTA.
- If the event is running but no matches are decided: "On the course — first results posted soon" plus the current round name and tee window.
- Once results exist, render the existing `ScoreBar` and `RoundBlock` list.

Also update the **Schedule** page so the current day is pinned to the top with a live countdown to its tee window, and the status badge is larger and tappable to jump back to the live board.

### 2. Captain score-entry polish

Captains already have one-tap result buttons, but they are small under pressure and the clinch math is buried. Improve the live board for captains:

- Make each `MatchResultButtons` button at least `min-h-12` and full-width within its row, with larger touch targets.
- Add a sticky sub-header above the match list that shows "X of 26 points still on the course" and "Y points to clinch" using the existing `clinchSummary` helper.
- Default the existing `ScoreModal` to the round whose `roundStatus` is `live` (or the first upcoming round if none is live), instead of listing all 23 matches flat.

### 3. Smart side-bet claiming

CTP and Long Drive claims currently use a free-text player name input, which leads to typos and makes roster-side cash totals unreliable. Replace the free-text input in `BetClaim` with a dropdown of roster player names, plus an "Other" free-text fallback for edge cases. This ensures every claim maps cleanly to a player row in the roster and purse math.

## Phase 2 — Visual system overhaul

### 4. Execute the weight & aesthetic overhaul

Implement the existing aesthetic plan in full:

- Drop the second display typeface and run one family across the app.
- Define a real type scale (`display`, `title`, `body`, `label`, `micro`) as Tailwind utilities in `src/styles.css` and remove the scattered `text-[10px] tracking-[0.16em]` strings.
- Introduce three surface levels: hero surface for the live score, hairline-divided sections for content, quiet inline rows for secondary data. Most `surface` cards become dividers.
- Restrain gold to the single most important number per screen and active nav state; copper stays the opposing-team color.
- Standardize motion to one easing curve, two durations, and a shared reduced-motion guard.

### 5. Photo vault upgrade

Move the photo grid from a fixed 3-column layout to a masonry feel, add a tap-to-view lightbox, and show upload progress for large images. Keep the existing realtime subscription and delete-your-own behavior.

## Phase 3 — Final verification

After all work is complete, run the following checks before considering the milestone done:

- `tsgo` typecheck passes with zero errors.
- `vitest run` passes: scoring, purse, and any new logic tests.
- Production build (`bun run build`) succeeds.
- Manual preview checks:
  - Live board updates automatically when a captain posts a result (test across two browser tabs).
  - Offline: load the app, turn off network, post a captain result, turn network back on, confirm it syncs and the board refreshes.
  - Side-bet claim dropdown maps to the correct player and updates the purse page total.
  - Schedule page pins the current day and the countdown is accurate.
  - Visual tokens: no hardcoded colors in components, one font family loaded, reduced-motion preference respected.
