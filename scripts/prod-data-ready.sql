-- Tin Cup 2026 — production data sync (safe while users sign in)
-- Run in Nhost SQL editor / Hasura when convenient. Does NOT change auth.
-- Safe: only updates match pairings + side pot amounts; no DDL on auth/profiles.

-- ---------------------------------------------------------------------------
-- 1) Confirm field (expect 2 teams, 16 players, 3 rounds)
-- ---------------------------------------------------------------------------
-- SELECT (SELECT count(*) FROM teams) AS teams,
--        (SELECT count(*) FROM players) AS players,
--        (SELECT count(*) FROM rounds) AS rounds,
--        (SELECT count(*) FROM matches) AS matches,
--        (SELECT count(*) FROM side_bets) AS side_bets;

-- ---------------------------------------------------------------------------
-- 2) Side pots = $100 CTP × 6 + LD × 2; holes stay TBD
-- ---------------------------------------------------------------------------
UPDATE public.side_bets
SET amount = 100,
    hole = NULL,
    label = CASE sort_order
      WHEN 1 THEN 'CTP - Friday front'
      WHEN 2 THEN 'CTP - Friday back'
      WHEN 3 THEN 'CTP - Saturday front'
      WHEN 4 THEN 'CTP - Saturday back'
      WHEN 5 THEN 'CTP - Sunday front'
      WHEN 6 THEN 'CTP - Sunday back'
      WHEN 7 THEN 'Long Drive - Friday'
      WHEN 8 THEN 'Long Drive - Saturday'
      ELSE label
    END,
    revision = revision + 1,
    updated_at = now()
WHERE kind IN ('ctp', 'ld');

-- ---------------------------------------------------------------------------
-- 3) Day 1 pairings on Friday scramble + alt-shot matches
--    side_a = Strong Mental, side_b = Grass Roots
-- ---------------------------------------------------------------------------
UPDATE public.matches m
SET
  side_a = v.side_a,
  side_b = v.side_b,
  revision = m.revision + 1,
  updated_at = now()
FROM (
  VALUES
    ('Scramble Match 1', 'Zack / Chris', 'Charles / Blake'),
    ('Scramble Match 2', 'Nick / Andrew', 'Neil / Mike'),
    ('Scramble Match 3', 'Kevin / Max', 'Dan / Josef'),
    ('Scramble Match 4', 'Seth / Keenan', 'Casey / Barry'),
    ('Alt Shot Match 1', 'Zack / Chris', 'Charles / Blake'),
    ('Alt Shot Match 2', 'Nick / Andrew', 'Neil / Mike'),
    ('Alt Shot Match 3', 'Kevin / Max', 'Dan / Josef'),
    ('Alt Shot Match 4', 'Seth / Keenan', 'Casey / Barry')
) AS v(label, side_a, side_b)
JOIN public.rounds r ON r.slug = 'friday'
WHERE m.round_id = r.id AND m.label = v.label;

-- ---------------------------------------------------------------------------
-- 4) Verify pairings + pots
-- ---------------------------------------------------------------------------
-- SELECT m.label, m.side_a, m.side_b
-- FROM matches m
-- JOIN rounds r ON r.id = m.round_id
-- WHERE r.slug = 'friday'
-- ORDER BY m.sort_order;

-- SELECT kind, label, amount, hole FROM side_bets ORDER BY sort_order;
