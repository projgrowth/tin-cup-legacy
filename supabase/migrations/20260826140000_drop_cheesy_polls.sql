-- Keep the first-hole 3-putt dare. The other two were too cheesy.
update public.clubhouse_polls
set deleted_at = now()
where deleted_at is null
  and question in (
    'Most likely to bomb a 3-wood from 90 yards',
    'Most likely to buy the steakhouse table a round'
  );
