-- =============================================================================
-- Tin Cup 2026 — PRODUCTION DATA FIX (run entire file in Nhost SQL editor)
-- Project: crgtkfggsuplprwqutbk · Does NOT touch auth.users
-- Safe to re-run (idempotent updates).
-- =============================================================================

-- 0) Avatar column for profile photos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path text;

-- 1) Side pots → $100 each, holes TBD
-- (Works even if labels are still "South CTP 1" etc.)
UPDATE public.side_bets
SET
  amount = 100,
  hole = NULL,
  revision = COALESCE(revision, 0) + 1,
  updated_at = now()
WHERE kind IN ('ctp', 'ld');

-- Optional: normalize labels to Kevin 2026 pots
UPDATE public.side_bets
SET label = CASE sort_order
  WHEN 1 THEN 'CTP - Friday front'
  WHEN 2 THEN 'CTP - Friday back'
  WHEN 3 THEN 'CTP - Saturday front'
  WHEN 4 THEN 'CTP - Saturday back'
  WHEN 5 THEN 'CTP - Sunday front'
  WHEN 6 THEN 'CTP - Sunday back'
  WHEN 7 THEN 'Long Drive - Friday'
  WHEN 8 THEN 'Long Drive - Saturday'
  ELSE label
END
WHERE kind IN ('ctp', 'ld') AND sort_order BETWEEN 1 AND 8;

-- 2) Day 1 pairings on Friday scramble + alt-shot
UPDATE public.matches m
SET
  side_a = v.side_a,
  side_b = v.side_b,
  revision = COALESCE(m.revision, 0) + 1,
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

-- 3) VERIFY — you should see amounts 100 and filled side_a/side_b
SELECT 'side_bets' AS check, count(*)::text AS n,
       min(amount)::text AS min_amt, max(amount)::text AS max_amt
FROM public.side_bets WHERE kind IN ('ctp', 'ld')
UNION ALL
SELECT 'friday_paired', count(*)::text,
       count(side_a)::text, count(side_b)::text
FROM public.matches m
JOIN public.rounds r ON r.id = m.round_id
WHERE r.slug = 'friday'
UNION ALL
SELECT 'avatar_col',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'profiles'
           AND column_name = 'avatar_path'
       ) THEN 'yes' ELSE 'no' END,
       '', '';

SELECT m.label, m.side_a, m.side_b
FROM public.matches m
JOIN public.rounds r ON r.id = m.round_id
WHERE r.slug = 'friday'
ORDER BY m.sort_order;

SELECT sort_order, kind, label, amount, hole
FROM public.side_bets
ORDER BY sort_order;
