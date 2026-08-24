-- Unofficial live status posted by claimed players. Official cup result stays matches.result.

create table if not exists public.match_live_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  pairing_key text not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (length(trim(status)) between 1 and 40),
  holes jsonb,
  updated_at timestamptz not null default now(),
  unique (pairing_key, reporter_id)
);

create index if not exists match_live_reports_pairing_idx on public.match_live_reports(pairing_key, updated_at desc);
alter table public.match_live_reports enable row level security;

create or replace function private.player_listed_in_match(_player_id uuid, _match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    join public.players p on p.id = _player_id
    where m.id = _match_id
      and (
        m.side_a ilike '%' || split_part(p.name, ' ', 1) || '%'
        or m.side_b ilike '%' || split_part(p.name, ' ', 1) || '%'
      )
  );
$$;

revoke all on function private.player_listed_in_match(uuid, uuid) from public, anon;
grant execute on function private.player_listed_in_match(uuid, uuid) to authenticated, service_role;

create policy "live reports readable by signed-in"
on public.match_live_reports for select to authenticated
using (true);

create policy "claimed players post own live reports"
on public.match_live_reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and private.is_claimed_player((select auth.uid()))
  and player_id = (select player_id from public.profiles where id = (select auth.uid()))
  and (
    private.is_scorekeeper((select auth.uid()))
    or match_id is null
    or private.player_listed_in_match(player_id, match_id)
  )
);

create policy "claimed players update own live reports"
on public.match_live_reports for update to authenticated
using (reporter_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())))
with check (
  reporter_id = (select auth.uid())
  or private.is_scorekeeper((select auth.uid()))
);

create policy "own or scorekeeper delete live reports"
on public.match_live_reports for delete to authenticated
using (reporter_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'match_live_reports'
  ) then
    alter publication supabase_realtime add table public.match_live_reports;
  end if;
end $$;

-- Grant captain when the claimed roster seat is Dan Rodriguez (QA) or an is_captain player.
create or replace function private.grant_captain_on_roster_claim()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.player_id is not null and (
    tg_op = 'INSERT' or new.player_id is distinct from old.player_id
  ) then
    if exists (
      select 1 from public.players
      where id = new.player_id
        and (is_captain = true or lower(name) = 'dan rodriguez')
    ) then
      insert into public.user_roles (user_id, role)
      values (new.id, 'captain')
      on conflict (user_id, role) do nothing;
    end if;
  end if;
  return new;
end;
$$;

insert into public.user_roles (user_id, role)
select pr.id, 'captain'
from public.profiles pr
join public.players p on p.id = pr.player_id
where lower(p.name) = 'dan rodriguez'
on conflict (user_id, role) do nothing;
