-- First-hole 3-putt is the default dare. Keep existing votes.
update public.clubhouse_polls
set question = 'Most likely to 3-putt the first hole'
where deleted_at is null
  and question in ('Most likely to 3-putt', 'Most likely to 3-putt first hole');
