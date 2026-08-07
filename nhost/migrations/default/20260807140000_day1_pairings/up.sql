-- Day 1 pairings (South scramble + alt-shot). Same groups for both formats.
-- side_a = Strong Mental, side_b = Grass Roots.

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
