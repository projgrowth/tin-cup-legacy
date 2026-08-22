-- The Card: bragging-rights picks + optional roast.
-- Self-contained so it can land on a board that never received the staged social SQL.
-- Official scoring tables and authority are unchanged.

create or replace function private.is_claimed_player(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = _user_id and player_id is not null)
$$;
revoke all on function private.is_claimed_player(uuid) from public, anon;
grant execute on function private.is_claimed_player(uuid) to authenticated, service_role;

create table if not exists public.match_predictions (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('side-a', 'halved', 'side-b')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(match_id, user_id)
);
alter table public.match_predictions
  add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_predictions_note_length'
  ) then
    alter table public.match_predictions
      add constraint match_predictions_note_length
      check (note is null or char_length(trim(note)) between 1 and 140);
  end if;
end $$;

alter table public.match_predictions enable row level security;
grant select on public.match_predictions to anon, authenticated;
grant insert, update, delete on public.match_predictions to authenticated;

drop policy if exists "prediction aggregates unlock after voting" on public.match_predictions;
drop policy if exists "public reads the card" on public.match_predictions;
drop policy if exists "claimed players predict open matches" on public.match_predictions;
drop policy if exists "owners edit open predictions" on public.match_predictions;
drop policy if exists "owners remove open predictions" on public.match_predictions;

create policy "public reads the card" on public.match_predictions for select using (true);
create policy "claimed players predict open matches" on public.match_predictions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_claimed_player((select auth.uid()))
  and exists(select 1 from public.matches m where m.id = match_id and m.result = 'pending')
);
create policy "owners edit open predictions" on public.match_predictions for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists(select 1 from public.matches m where m.id = match_id and m.result = 'pending')
);
create policy "owners remove open predictions" on public.match_predictions for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists(select 1 from public.matches m where m.id = match_id and m.result = 'pending')
);

drop trigger if exists match_predictions_touch on public.match_predictions;
create trigger match_predictions_touch before update on public.match_predictions
for each row execute function public.touch_updated_at();
