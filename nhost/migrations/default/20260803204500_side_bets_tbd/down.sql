UPDATE public.side_bets
SET
  label = CASE sort_order
    WHEN 1 THEN 'CTP - South No. 4'
    WHEN 2 THEN 'CTP - South No. 13'
    WHEN 3 THEN 'CTP - Copperhead No. 8'
    WHEN 4 THEN 'CTP - Copperhead No. 15'
    WHEN 5 THEN 'CTP - Island No. 6'
    WHEN 6 THEN 'CTP - Island No. 17'
    WHEN 7 THEN 'Long Drive - Friday'
    WHEN 8 THEN 'Long Drive - Saturday'
    ELSE label
  END,
  hole = CASE sort_order
    WHEN 1 THEN 4
    WHEN 2 THEN 13
    WHEN 3 THEN 8
    WHEN 4 THEN 15
    WHEN 5 THEN 6
    WHEN 6 THEN 17
    WHEN 7 THEN 9
    WHEN 8 THEN 18
    ELSE hole
  END,
  amount = CASE WHEN kind = 'ctp' THEN 93 ELSE 120 END
WHERE sort_order BETWEEN 1 AND 8
  AND kind IN ('ctp', 'ld');
