# Nhost P0 — data + avatars (do this before more UI)

Live probe (2026-08) found:
- Side pot amounts still **0**
- Friday match pairings still **null**
- Public GraphQL cannot query **`profiles`** (avatars won’t show for guests)

## A. SQL (Nhost → SQL editor)

1. Open project **crgtkfggsuplprwqutbk**
2. Paste **entire** `scripts/prod-data-ready.sql`
3. Run
4. Confirm verify tables at bottom:
   - side_bets min/max amount = **100**
   - friday_paired counts for side_a/side_b = number of Friday matches
   - avatar_col = **yes**
   - Match rows show Zack / Chris etc.

## B. Hasura permissions for avatars

In **Hasura / Data → profiles** (or apply repo metadata):

1. Ensure column **`avatar_path`** is tracked  
2. **public** role — Select:  
   `id`, `display_name`, `player_id`, `avatar_path`  
   Filter: `{}` (or allow all rows)  
3. **user** role — Select those + timestamps  
4. **user** role — Update (own row only):  
   `display_name`, `player_id`, `avatar_path`  
   Filter: `id = X-Hasura-User-Id`

Repo reference: `nhost/metadata/databases/default/tables/public_profiles.yaml`

If you use the CLI metadata apply script:

```bash
# Copy Hasura admin secret to clipboard, then:
node scripts/apply-nhost-metadata.mjs
```

(Only if that script includes the latest profiles permissions.)

## C. Verify from laptop

```bash
node scripts/verify-prod-data.mjs
```

Expect three **PASS** lines.

## D. Why UI still looked fine

Home/Schedule **static** Day 1 list is in app code (doesn’t need DB).  
**Live match cards** and **purse GraphQL amounts** need step A.  
**Avatar photos** need A + B.
