# 2026 content source of truth

## Canonical document

**Primary (your Desktop save):**  
`/Users/projgrowth/Desktop/4th Annual Tin Cup Invitational 2026.pdf`

**Repo copy (for builds / other machines):**  
`docs/4th-Annual-Tin-Cup-Invitational-2026.pdf`

That is the official **4th Annual Tin Cup Invitational 2026** invite deck (the PowerPoint you saved to Desktop — stored as PDF).  
All tournament facts in the app must match **this** document.

| Do use | Do **not** use |
|--------|----------------|
| Desktop: `4th Annual Tin Cup Invitational 2026.pdf` | Older `Tin Cup Invitational.pptx` (AI Library) — different year (Winter Park / OCN / Royal St. Cloud, $20, 18 pts) |
| Same deck if also under iCloud/Messages | Any prior-year invite |

---

## Fact matrix (Desktop deck ↔ app)

| Fact | Desktop deck | App location | Status |
|------|--------------|--------------|--------|
| Title / tagline | 4th Annual; “Where the vibes are high and the divots are deep” | `EVENT` in `src/lib/tin-cup.ts` | Match |
| Dates | Aug 28–30, 2026 | `EVENT.dates`, round seed | Match |
| Venue | Innisbrook (implied by courses) | `EVENT.location` | Match |
| Field | 16 players (8 + 8 named) | Seed + `EXPECTED_PLAYER_COUNT` | Match |
| Strong Mental · Captain | Zack Smith; Chris Maher, Andrew Kezsbom, Nick Sears, Max Furth, Kevin Maher, Seth Beaver, Keenan Horrell | DB seed | Match |
| Grass Roots · Captain | Charles Grass; Neil Candelora, Blake Weeks, Mike Maher, Dan Rodriguez, Josef Yehia, Casey Gillespie, Barry Rigby | DB seed | Match |
| Buy-in | $150 (includes auto entry to CTP + LD); optional side skins on Singles + Stableford | `BUY_IN`, `FEE_BREAKDOWN`, money rules | Match |
| Winner payout | $200 / player ($100 back + opponent money) | purse settlement | Match |
| CTP | Deck $93; **Kevin admin → $100 each** (×6) | UI + DB $100 | Kevin override |
| Long Drive | Deck $120; **Kevin admin → $100 each** (×2, fairway) | UI + DB $100 | Kevin override |
| Contest holes | Friday CTP 3 & 18, LD 13; other days TBD | `DAY1_CONTESTS` overlay → “Hole N” / “Hole TBD” | Captains set pairings only |
| Friday | South · 12:19–12:44 pm · Scramble / **Modified** Alternate Shot · 4/4 (8) | Round seed + format rules | Match (wording: Modified Alt Shot) |
| Saturday | Copperhead · 9:54–10:20 am · Modified Stableford full team · 2/2/2 (6) | Round seed | Match |
| Sunday | Island · 9:54–10:20 am · Shamble / Singles · 4/8 (12) | Round seed | Match |
| Cup | 26 total points; **13.5 to win** | `EVENT` | Match |
| Playoff | Captain and his pick, 2v2 scramble, one hole until decided | Rules copy (playoff hole TBD) | Match |
| Friday social | Pool (if weather) → Salamander Grille dinner | `WEEKEND_SOCIAL` | Match |
| Saturday social | Breakfast included; free time / extra golf / bikes / pool; Steakhouse **7 PM** | `WEEKEND_SOCIAL` | Match |
| Sunday social | Breakfast; stick around for lunch + awards (brief ceremony) | `WEEKEND_SOCIAL` | Match |
| Awards | Championship Trophy; Chubbs Peterson MVP; Steve Stinson Vibes | Seed + `TROPHIES` (+ optional Snake Pit house award not on deck) | Match |
| Venmo bank | Not on deck; ops: Kevin / Kmaher | `VENMO_HANDLE` | Ops-confirmed |

---

## Gates

- **Side pots:** Kevin (admin) set **$100 CTP / $100 LD** (overrides deck $93/$120).  
- **Holes TBD** → keep “Hole TBD”; captains set **match pairings**, not contest holes.  
- **Kevin** = admin / bank, **not** team captain (Zack + Charles are captains).
