-- Tournament organizer feedback: contest holes and payouts are not confirmed.
-- Zero is a temporary persisted sentinel; the UI renders it as TBD.
UPDATE public.side_bets
SET
  label = CASE sort_order
    WHEN 1 THEN 'South CTP 1'
    WHEN 2 THEN 'South CTP 2'
    WHEN 3 THEN 'Copperhead CTP 1'
    WHEN 4 THEN 'Copperhead CTP 2'
    WHEN 5 THEN 'Island CTP 1'
    WHEN 6 THEN 'Island CTP 2'
    WHEN 7 THEN 'Friday Long Drive'
    WHEN 8 THEN 'Saturday Long Drive'
    ELSE label
  END,
  hole = NULL,
  amount = 0
WHERE sort_order BETWEEN 1 AND 8
  AND kind IN ('ctp', 'ld');
