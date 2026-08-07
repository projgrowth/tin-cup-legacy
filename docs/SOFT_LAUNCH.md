# Soft launch — send to the field (explore + claim)

**Production:** https://tincupinv.com  
**Git:** `main` pushed (hubs + monograms live).  
**Do not redeploy** while people are signing in unless a critical bug forces it.

## What the group can do right now

| OK now | Later (not promised in blast) |
|--------|--------------------------------|
| Browse scores, schedule, pairings, maps, pay | Trust dual-phone live scoring |
| Sign in + claim roster name | Full captain scoring ops |
| Optional photos (Pulse) if storage works | In-app chat (use WhatsApp) |

## Message template

```
Tin Cup 2026 board is live:
https://tincupinv.com

If you're in the field: Account → sign in → claim your name.
Anyone can open the link to follow the live cup.

Also: Pay $150, Day 1 pairings, schedule, course maps, teams.
Live scoring the weekend — captains post results.
Chat stays in WhatsApp.
```

## Backend you can do without interrupting sign-in

**Status check (run anytime):**

```bash
node scripts/verify-prod-data.mjs
```

If FAIL: follow **`docs/NHOST_P0.md`** (SQL + Hasura avatar/public profiles).

Run when free (Nhost SQL → paste full `scripts/prod-data-ready.sql`):

1. Side pots $100 + holes NULL  
2. Friday match `side_a` / `side_b` Day 1 pairings  
3. `profiles.avatar_path` column  

Does **not** touch `auth.*`. Still need Hasura perms for public avatar read.

## After people start claiming (same day / this week)

1. Kevin: set `INITIAL_ADMIN_EMAILS` (server env) → claim admin on `/admin`  
2. Zack + Charles sign in once → Kevin grants **captain**  
3. Optional: `CAPTAIN_EMAILS=...` + Sync on `/ops`  
4. Dual-phone smoke (EVENT_OPS.md §4)  
5. Optional: `VITE_WHATSAPP_GROUP_URL` + **one** redeploy for Group chat button  

## Do not do during blast window

- Force-push or wipe DB  
- Change magic-link redirect URLs mid-test  
- Drop/recreate players while people claim  
- Broad frontend experiments  

## Support

Issues → Kevin in the group. Captains: Add to Home Screen before the weekend.
