-- Shit-talk superlatives. Not official. Not match winners.

create table if not exists public.banter_votes (
  id uuid primary key default gen_random_uuid(),
  prompt_id text not null,
  voter_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (prompt_id, voter_id)
);

create index if not exists banter_votes_prompt_idx on public.banter_votes(prompt_id, updated_at desc);
alter table public.banter_votes enable row level security;

create policy "banter votes readable by signed-in"
on public.banter_votes for select to authenticated
using (true);

create policy "claimed players insert own banter votes"
on public.banter_votes for insert to authenticated
with check (
  voter_id = (select auth.uid())
  and private.is_claimed_player((select auth.uid()))
);

create policy "claimed players update own banter votes"
on public.banter_votes for update to authenticated
using (voter_id = (select auth.uid()))
with check (voter_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'banter_votes'
  ) then
    alter publication supabase_realtime add table public.banter_votes;
  end if;
end $$;
