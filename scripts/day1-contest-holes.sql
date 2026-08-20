-- Optional hosted apply. Do not run unless Kevin approves a production SQL change.
-- Day 1 (Friday / South): CTP holes 3 and 18, long drive 13.
-- Other days stay NULL / TBD. The client already overlays these values.

UPDATE side_bets
SET hole = 3
WHERE kind = 'ctp'
  AND hole IS NULL
  AND label ILIKE '%friday%'
  AND label ILIKE '%front%';

UPDATE side_bets
SET hole = 18
WHERE kind = 'ctp'
  AND hole IS NULL
  AND label ILIKE '%friday%'
  AND label ILIKE '%back%';

UPDATE side_bets
SET hole = 13
WHERE kind IN ('ld', 'long-drive')
  AND hole IS NULL
  AND label ILIKE '%friday%';
