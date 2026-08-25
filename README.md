# Tin Cup Legacy

Build a modern, ultra-luxurious, progressive web app (PWA) for the "4th Annual Tin Cup Invitational 2026" at Innisbrook Golf Resort. The aesthetic should rival Apple or Nike digital product portals using dark glassmorphism, 3D interactive graphics, and zero-friction single-handed mobile navigation.

---

### 1. DESIGN SYSTEM & VISUAL STYLE

- Palette: Deep Charcoal/Emerald (#080f0a, #0b130e), Frosted Glass (rgba(15, 28, 19, 0.65) with backdrop-blur-xl), Brushed Gold (#D4AF37, #FFE082), Copper (#B87333).

- UI Components: 1px gold glowing borders (`border-amber-500/20`), rounded cards (`rounded-2xl`), active touch press effects (`active:scale-95`).

- Typography: Plus Jakarta Sans for UI/Data, Playfair Display for headers.

- Resilience: If 3D canvas fails to load within 1.5s, fall back gracefully to a high-res styled glass trophy SVG/image icon.

---

### 2. HERO SECTION & 3D INTERACTIVE ENGINE

- Interactive Three.js/Spline Canvas:

  - Render a 3D Championship Trophy coiled by a metallic Copperhead snake with mouse/touch drag-to-rotate controls.

- Hero Copy:

  - Title: "4th Annual Tin Cup Invitational"

  - Subtitle: "Where the vibes are high and the divots are deep"

  - Location: "Innisbrook Golf Resort • Palm Harbor, FL"

  - Dates: "August 28–30, 2026"

  - Action Button: Prominent "Pay $150 Buy-In" button linking directly to Venmo/Zelle.

---

### 3. CONTEXTUAL VIEW SELECTOR (Pre-Event / Live / Post-Event)

Include a top status segmented control to toggle app focus:

1. Pre-Tournament (Default):

   - Countdown timer to Friday 12:19 PM tee time, 3-day itinerary, team rosters, and $150 entry fee breakdown.

2. Live Tournament Mode:

   - Live 26-Point Match Scoreboard (13.5 to win). Halved matches award 0.5 pts each.

   - Live Side-Bet Leaderboard (CTP & Long Drive holders).

3. Post-Event Hall of Fame:

   - Trophy Room (Championship Trophy, Chubbs Peterson MVP, Steve Stinson Vibes Award, Snake Pit Trophy) + photo upload vault.

---

### 4. DATA ARCHITECTURE & CONTENT (2026 Slide Details)

#### A. Teams & Rosters (16-player field)

- Team Strong Mental: Zack Smith (C), Chris Maher, Andrew Kezsbom, Nick Sears, Max Furth, Kevin Maher, Seth Beaver, Keenan Horrell.

- Team Grass Roots: Charles Grass (C), Neil Candelora, Blake Weeks, Mike Maher, Dan Rodriguez, Josef Yehia, Casey Gillespie, Barry Rigby.

#### B. Schedule & Course Formats (26 Total Points)

- Fri Aug 28 | South Course | 12:19–12:44 PM | Scramble / Modified Alternate Shot (8 Pts) | Dinner: Salamander Grille
  (Source of truth: Desktop `4th Annual Tin Cup Invitational 2026.pdf`)

- Sat Aug 29 | Copperhead Course | 9:54–10:20 AM | Modified Stableford Match Play (6 Pts - 2/2/2 breakdown) | Dinner: 7 PM Steakhouse

- Sun Aug 30 | Island Course | 9:54–10:20 AM | Shamble / Singles (12 Pts - 4/8) | Lunch & Awards Ceremony

- Playoff: 13–13 is captain and his pick, 2v2 scramble, one hole until decided.

#### C. Stakes & Side Cash ($150 Buy-In)

- Winning Team: $200 per player ($100 returned + $100 opponent money)

- Closest to Pin (CTP): 6 opportunities @ $100 each

- Long Drive (LD): 2 opportunities (Friday & Saturday) @ $100 each (must hit fairway)

- Side Skins: Optional buy-in on Stableford & Singles rounds

---

### 5. INTERACTIVE APP FEATURES & ERGONOMICS

- Fixed Bottom Navigation Bar:

  - 📊 Leaderboard | 📅 Schedule | 👥 Rosters | 💰 Purse & Rules

- Quick Captain Score Input Modal:

  - 2-tap popup to record match updates or log CTP/Long Drive claims (Player, Hole #, Distance). Save state to `localStorage` immediately.

- Course & Snake Pit Interactive Guide:

  - Drawer modal displaying Copperhead's Snake Pit (Holes 16, 17, 18) with hole previews and pro tips.

## Backend

The active backend is Supabase for Postgres, Auth, Realtime, Storage, and
row-level security. Timestamped schema and security changes live in
`supabase/migrations`.

For a new Supabase project:

1. Copy `.env.example` to `.env.local` and set the public URL and publishable key.
2. Apply every file in `supabase/migrations` in timestamp order.
3. Set `SUPABASE_SERVICE_ROLE_KEY` only in the server deployment environment.
4. Configure Supabase Site URL and allowed redirects for apex, `www`, and preview callbacks.

Never expose a Supabase secret/service-role key in a `VITE_` variable or commit it.
The old Nhost adapter, package, migrations, and production variables remain only
for rollback until the 14-day soak and final recoverable backup are complete.

## Event-day ops

Before the weekend, complete the checklist in **[EVENT_OPS.md](./EVENT_OPS.md)** or the in-app **`/ops`** page:

1. Set `VITE_VENMO_HANDLE` (see `.env.example`)
2. Claim first admin on `/admin`
3. Grant captains from `/admin`, or configure `CAPTAIN_EMAILS` and let each captain sync on `/ops`
4. Run the manual dual-phone scoring and airplane-mode test in `EVENT_OPS.md`

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
# copy .env.example → .env.local and set Supabase + VITE_VENMO_HANDLE
npm run dev
```

```sh
npm test          # unit suite (scoring, purse, write-queue, ops checks)
npm run check     # tests + TypeScript
npm run build     # production build + service worker
```

### In-app ops

After sign-in, open **`/ops`** for:

- Live readiness score (Venmo, seed data, captain role, queue, service worker)
- One-tap captain access sync for the server-only email allowlist
- A safe two-phone test checklist that never creates a fake production score
