# Priority UX Fixes — Tin Cup Nexus

Four changes, in order.

## 1. Date-aware default view

The home screen always opens on "Pre" because the mode is hardcoded. Add an `endsAt` value for the tournament (Sunday Aug 30, end of day ET) to the event config and compute the starting mode once on mount:

- before first tee -> Pre
- first tee through end of Sunday -> Live
- after -> Hall of Fame

Computed on mount (client-side, after hydration) so the server and browser can't disagree, with Pre as the server value. The user can still switch tabs manually.

## 2. One place for each piece of content

Bottom nav becomes the only real navigation. The segmented control stays, but the Pre panel stops repeating what `/schedule` and `/rosters` already show:

- Pre panel: Countdown + $150 entry summary, then two link cards — "View full schedule" and "View rosters" — into those routes.
- Live panel: unchanged (ScoreBar + Side Cash).
- Hall of Fame panel: unchanged.
- `/schedule`, `/rosters`, `/purse`: unchanged, single source of truth.

## 3. Smaller trophy hero

The trophy currently sizes off width, so it can be ~400px tall and pushes the countdown below the fold. Constrain it by height instead: about 200px on small phones, up to ~240px on larger ones, staying square and centered. Drag-to-rotate, the glow, and the 1.5s fallback image behave exactly as they do now.

## 4. Persistent captain sign-in

Add a small round icon button in the top-right of the app shell on every screen, linking to `/captain`. Uses a lucide key/user icon; when a session exists it renders in a filled gold state so a signed-in captain can tell at a glance. The existing link at the bottom of `/purse` stays.

## Technical notes

- `src/lib/tin-cup.ts`: add `endsAt: "2026-08-30T23:59:59-04:00"` and a `defaultMode()` helper returning `"pre" | "live" | "post"`.
- `src/routes/index.tsx`: keep `useState<Mode>("pre")` and add a `useEffect` that sets the computed mode on mount.
- `src/components/tin-cup/panels.tsx`: trim `PreTournamentPanel` to Countdown + fee summary + two `<Link>` cards; drop its now-unused `rounds`/`players`/`teams` props and update the call site in `index.tsx`.
- `src/components/tin-cup/TrophyStage.tsx`: wrapper becomes height-capped (`h-[200px] sm:h-[240px]`, square and centered); the Three.js resize handler already reads `clientWidth`/`clientHeight`, so no engine changes.
- `src/components/tin-cup/Shell.tsx`: header row with the `/captain` icon link, styled via existing `glass`/`press` utilities and `useAuth()` for the signed-in state.
- Also fixes the existing countdown hydration warning, since the seconds value will render client-side only.
- No backend, RLS, ScoreModal, or realtime changes.
