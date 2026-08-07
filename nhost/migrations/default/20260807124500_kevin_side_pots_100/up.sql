-- Kevin (admin) 2026-08: CTP and Long Drive pots are $100 each.
-- Contest holes stay TBD (clear any seed hole numbers).
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
    END
WHERE kind IN ('ctp', 'ld');
