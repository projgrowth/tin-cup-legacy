# Tin Cup Invitational 2026 — Luxury Tournament PWA

A dark, gold-accented mobile app for the 4th Annual Tin Cup Invitational at Innisbrook (Aug 28-30, 2026), with a shared live scoreboard so everyone sees the same numbers.

## Look and feel

- Deep charcoal/emerald backgrounds (#080f0a, #0b130e), frosted glass panels with blur, thin glowing gold borders, brushed gold and copper accents.
- Playfair Display headlines, Plus Jakarta Sans for data and UI.
- Rounded cards, tap-press feedback, thumb-reachable layout, fixed bottom nav.
- Installable on a phone home screen (app icon, standalone display) via manifest + icons; no offline caching.

## Hero

- 3D championship trophy coiled by a copper snake, drag/swipe to rotate (Three.js). If it does not load within 1.5s, an elegant gold glass trophy graphic takes its place.
- Title, "Where the vibes are high and the divots are deep", Innisbrook Golf Resort - Palm Harbor, FL, August 28-30, 2026.
- "Pay $150 Buy-In" button opening Venmo (deep link on mobile, web fallback), wired through a single config value you can swap.

## Three modes via a segmented control at top

1. Pre-Tournament (default): live countdown to Friday 12:19 PM tee time, 3-day itinerary, both 8-man rosters, $150 entry fee breakdown.
2. Live: 26-point scoreboard (13.5 to win, halved matches 0.5 each), per-round point pools (8 / 6 / 12), and CTP + Long Drive side-bet leaderboard.
3. Hall of Fame: trophy room (Championship, Chubbs Peterson MVP, Steve Stinson Vibes, Snake Pit) and photo vault with uploads.

## Bottom navigation

Leaderboard - Schedule - Rosters - Purse & Rules

## Captain tools

- 2-tap modal to post a match result (win / loss / halved) or claim a CTP / Long Drive (player, hole, distance). Writes immediately and every open phone updates live.
- Sign-in required to post; everyone else views without an account.

## Snake Pit guide

- Bottom drawer for Copperhead holes 16-18 with hole art and pro tips.

## Content baked in

Both rosters with captains (Strong Mental: Zack Smith C, Chris Maher, Andrew Kezsbom, Nick Sears, Max Furth, Kevin Maher, Seth Beaver, Keenan Horrell; Grass Roots: Charles Grass C, Neil Candelora, Blake Weeks, Mike Maher, Dan Rodriguez, Josef Yehia, Casey Gillespie, Barry Rigby), all three rounds with courses, tee windows, formats, and meals, the 1-hole scramble playoff rule, and the full purse breakdown ($200 to winners, 6 CTPs at $93, 2 long drives at $120 fairway-only, optional skins).

## Technical notes

- Lovable Cloud (Postgres + auth + storage) backs shared state: `teams`, `players`, `rounds`, `matches`, `side_bets`, `photos`, plus `user_roles` for captain/admin rights. RLS: public read via anon SELECT policies, writes restricted to captains/admins through a `has_role` security-definer function; grants issued in the same migration.
- Realtime subscriptions push score changes to all open phones; last known scoreboard cached in localStorage for instant open.
- Photo vault uses a Cloud storage bucket with captain/authenticated upload policies.
- Three.js loaded client-side only behind a hydration gate, with a 1.5s timeout falling back to a generated trophy image asset.
- Routes: `/` (hero + mode selector + leaderboard), `/schedule`, `/rosters`, `/purse`, `/auth` for captains. Each gets its own head metadata.
- A seed migration inserts both teams, all 16 players, and the 3-round schedule so the app is populated on first load.

## Needed from you later

- Your Venmo handle (or Zelle) to replace the placeholder.
- Which people should get captain score-entry rights.
