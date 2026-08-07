# Next Best Improvements

Verified current state: 23 matches exist and none are scored, 0 accounts/roles, 0 photos, 0 player profiles linked, 8 side bets unclaimed, 4 trophies seeded. There is a manifest but no service worker, and no test files anywhere.

## 1. Offline app shell (event-day risk)

Innisbrook has dead spots. Outgoing writes already queue, but a cold load offline currently shows nothing.

- Add guarded offline support so the app opens without signal, HTML served network-first, hashed assets cache-first, and no service worker in preview/dev.

## 2. Score entry under pressure

Right now score input is one long list of 23 matches.

- Default the captain screen to the round that's live today, with a round switcher.
- Bigger tap targets for win / halve / loss, and a running "points still needed to reach 13.5" line at the top.

## 3. Scoring math safety net

The 26-point total, half-points for halved matches, per-round subtotals and the 13.5 clinch line are the one place a bug stays invisible until it's on the board.

- Add unit tests over the scoring helpers covering halves, partial rounds, ties, and clinch/eliminated states.

## 4. Make people findable

- Link each roster player to their profile page, and let a signed-in user claim which player they are (the link column exists but nothing is linked yet).
- Show captain badges and each player's side-cash won on the roster row.

## 5. Photo vault worth opening

- Live refresh so new uploads appear for everyone without a reload, plus an empty-state prompt, upload progress, and delete for your own photos.

## 6. Side bets and trophies

- One-tap CTP / Long Drive claim from the live board (currently all 8 are unclaimed with no fast path).
- Let an admin assign trophy winners after the event so the Hall of Fame fills in.

## Suggested order

1 (offline) and 2 (score entry) before the event; 3 alongside them; 4-6 after.

## Technical notes

- Offline support via `vite-plugin-pwa` with `generateSW`, `injectRegister: null`, a single guarded registration wrapper that refuses in dev/iframe/preview hosts and on `?sw=off`, `NetworkFirst` for navigations, `/~oauth` excluded.
- Tests with `vitest` against `src/lib/scoring.ts` (pure functions, no DB).
- Photo realtime via a Supabase channel subscription on `photos` in the browser client.
- Trophy winner assignment reuses the existing scorekeeper-gated update path on `trophies`; player-to-profile claiming writes `profiles.player_id` under the existing own-profile policy.
