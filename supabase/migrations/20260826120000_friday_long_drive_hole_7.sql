-- Friday / South long drive is hole 7 (captain 2026-08-25).
update public.side_bets
set hole = 7
where kind in ('ld', 'long-drive')
  and label ilike '%friday%';
