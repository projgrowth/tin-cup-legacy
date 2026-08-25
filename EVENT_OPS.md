# Event-day ops checklist — Tin Cup Invitational 2026

Do these **before** anyone arrives at Innisbrook. Order matters.

**Production domain:** `https://tincupinv.com`. Keep this URL and
`https://www.tincupinv.com` in the Nhost Auth allowed redirects before testing sign-in.

**Production social flags:** Clubhouse feed and The Card (match picks) are on.
Set `VITE_CLUBHOUSE_V1`, `VITE_WEEKEND_STORY_V2`, `VITE_MATCH_PREDICTIONS_V1`,
and `VITE_CLUBHOUSE_POLLS_V1`.
Leave check-ins, prompts, confirmations, and gallery off. Preview Vercel env should set
`VITE_RUNTIME_MODE=preview` so tournament writes stay simulated. Production omits
that variable (defaults to live scoring). Friday contest holes 3 / 18 / 13 are
client-overlaid even if the database still has `null`.

The Card is bragging-rights only — no cash, no Cup points. Official scoring stays captain-controlled.

**In-app helper:** open **`/ops`** after sign-in for live readiness lights, captain sync, and the safe two-phone test checklist.

## 0. Confirm the scoring-conflict guard

The unified Nhost migration at
`nhost/migrations/default/20260803170000_tin_cup_schema/up.sql` includes the
monotonic row revisions used to prevent two captains from silently overwriting
each other. Confirm that migration is applied before deploying this release.

After applying it, open `/ops` and confirm **Cross-device scoring guard** is green.

## 1. Buy-in link

1. Set the real Venmo handle (no `@`) in env:
   ```bash
   VITE_VENMO_HANDLE=Kmaher
   ```
   Or edit `src/lib/tin-cup.ts` if you are not using env injection.
2. Redeploy / rebuild so the Pay button uses it.
3. Open `/purse` or `/ops` on a phone and confirm the Venmo deep link opens the right account for **$150**.

## 1b. WhatsApp group (optional, recommended)

Chat stays in WhatsApp — the app only deep-links into the existing group (no bot, no Business API).

1. In WhatsApp: open the tournament group → **Group info** → **Invite to group via link** → Copy.
2. Set on Vercel (Production):
   ```bash
   VITE_WHATSAPP_GROUP_URL=https://chat.whatsapp.com/YOUR_INVITE
   ```
3. Redeploy. Confirm home shows **Group chat** and opens the right group on a phone.
4. **Share board** works without this env (native share / WhatsApp compose with `tincupinv.com`).

## 2. First admin (unlocks scoring)

Before anyone signs in, configure the server-only allowlist (never expose this as a
`VITE_` variable):

```bash
INITIAL_ADMIN_EMAILS=owner@example.com
```

1. Sign in once at `/captain` or `/profile` (email or Google).
2. Open `/admin`.
3. On the allowlisted owner account, tap **Claim admin access**.
4. Confirm the page lists every signed-in member.

> The first signed-in account is no longer automatically trusted. If `INITIAL_ADMIN_EMAILS` is
> missing or does not match the owner account, admin setup is intentionally blocked.

The confirmed 2026 field is 16 players. For a different
field size, set `VITE_EXPECTED_PLAYER_COUNT` before building:

```bash
VITE_EXPECTED_PLAYER_COUNT=16
```

## 2b. Roles (Kevin is admin, not a team captain)

| Role | Person | Notes |
|------|--------|--------|
| **admin** | Kevin Maher (tournament bank / organizer) | Manages `/admin`; can score as admin. **Do not** grant him `captain`. |
| **captain** | Zack Smith, Charles Grass | Set **match pairings**, post results, claim CTP/LD. |
| Contest holes | Friday: CTP 3 & 18, long drive 13. Other days TBD | Captains do **not** pick CTP/LD holes. |

## 3. Grant captains

Captains for 2026:

| Team          | Captain       |
| ------------- | ------------- |
| Strong Mental | Zack Smith    |
| Grass Roots   | Charles Grass |

**Preferred (manual admin grant):**

1. Zack and Charles each sign in once so their accounts appear on `/admin`.
2. An admin grants the **captain** role to both accounts.
3. Each captain confirms Live shows the gold **+** score FAB.

Roster identity on `/profile` never grants a role; it is intentionally separate from access control.

**Optional server-only email allowlist:**

```bash
CAPTAIN_EMAILS=zack@example.com,charles@example.com
```

Then each captain hits **Sync my captain access** on `/ops`. Never put this value in a
`VITE_` environment variable.

## 4. Dual-phone smoke test (mandatory)

Use two phones on different accounts: **Captain** + **Spectator**.

| Step                                            | Expected                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| Spectator open Live                             | Sees 0–0 or last known board (not a blank crash)                 |
| Captain post one clearly identified test result | Toast success; board updates on both phones within a few seconds |
| Captain immediately taps Clear                  | Test match returns to Not played on both phones                  |
| Captain set a pairing                           | Names show under the match on spectator                          |
| Captain claim a CTP with roster picker          | Name appears under Side Cash; `/purse` claimed total increases   |
| Airplane mode → captain posts → restore network | Pending banner, then auto-sync; spectator updates                |
| Airplane mode cold open (shell cached)          | App shell loads; board may show cached data                      |

## 5. Night-before checklist

- [ ] Venmo handle is real (not `TinCup-Invitational`)
- [ ] Admin exists
- [ ] Both captains have `captain` role
- [ ] Realtime works across two phones
- [ ] Offline write queue recovers after airplane mode
- [ ] PWA installed on captains' home screens (Add to Home Screen)
- [ ] Phone battery + portable chargers for captains

## 6. During the event

- Prefer the **inline result buttons** on Live (big touch targets).
- Mis-tap → use toast **Undo** or Clear.
- Dead zone: keep posting; queue will flush when signal returns. Do not force-refresh mid-queue.
- After Sunday: award trophies on Hall of Fame, open photo vault for the group.

## Troubleshooting

| Symptom                         | Fix                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| No score buttons                | Account missing captain/admin role → `/admin`                |
| Writes rejected                 | Not signed in, or role missing                               |
| Board stuck offline             | Check failed banner → Retry now; re-login if JWT expired     |
| Long Drive pots missing on Live | Fixed in app to accept DB kind `ld` — hard refresh if old SW |
| Venmo wrong person              | Set `VITE_VENMO_HANDLE` and redeploy                         |
