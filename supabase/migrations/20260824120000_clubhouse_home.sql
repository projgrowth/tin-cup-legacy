-- Clubhouse Home: locker reactions, captain-only polls, live tallies, seed superlatives.
-- Additive. Does not touch scoring.

alter table public.story_reactions drop constraint if exists story_reactions_kind_check;
alter table public.story_reactions
  add constraint story_reactions_kind_check
  check (kind in ('applause', 'fire', 'trophy', 'egg', 'flag'));

drop policy if exists "claimed players create polls" on public.clubhouse_polls;
create policy "scorekeepers create polls" on public.clubhouse_polls for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_scorekeeper((select auth.uid())));

drop policy if exists "poll results unlock after voting" on public.clubhouse_poll_votes;
create policy "public reads poll votes" on public.clubhouse_poll_votes for select using (true);

-- Seed three superlatives once, authored by the first admin/captain. Skip if none yet.
do $$
declare
  organizer uuid;
  poll_id uuid;
  q text;
  names text[] := array[
    'Zack Smith','Chris Maher','Nick Sears','Andrew Kezsbom',
    'Kevin Maher','Max Furth','Seth Beaver','Keenan Horrell',
    'Charles Grass','Blake Weeks','Neil Candelora','Mike Maher',
    'Dan Rodriguez','Josef Yehia','Casey Gillespie','Barry Rigby'
  ];
  i int;
begin
  if exists (select 1 from public.clubhouse_polls where deleted_at is null) then
    return;
  end if;

  select ur.user_id into organizer
  from public.user_roles ur
  where ur.role in ('admin', 'captain')
  order by case when ur.role = 'admin' then 0 else 1 end, ur.user_id
  limit 1;
  if organizer is null then
    return;
  end if;

  foreach q in array array[
    'Most likely to 3-putt',
    'Most likely to bomb a 3-wood from 90 yards',
    'Most likely to buy the steakhouse table a round'
  ]
  loop
    insert into public.clubhouse_polls (author_id, question, closes_at)
    values (organizer, q, '2026-08-30 23:59:59-04')
    returning id into poll_id;
    for i in 1..array_length(names, 1) loop
      insert into public.clubhouse_poll_options (poll_id, label, sort_order)
      values (poll_id, names[i], i - 1);
    end loop;
  end loop;
end $$;
