UPDATE public.matches m
SET side_a = NULL, side_b = NULL, revision = m.revision + 1, updated_at = now()
FROM public.rounds r
WHERE m.round_id = r.id AND r.slug = 'friday'
  AND m.label LIKE '%Match%';
