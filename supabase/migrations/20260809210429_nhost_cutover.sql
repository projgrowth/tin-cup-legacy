-- Bring the pre-Nhost Supabase schema forward to the current production shape.
-- User and application rows are copied separately during the controlled cutover.

alter table public.profiles
  add column if not exists avatar_path text;

create unique index if not exists photos_storage_path_key
  on public.photos(storage_path);
create index if not exists players_team_id_idx on public.players(team_id);
create index if not exists matches_round_id_idx on public.matches(round_id);
create index if not exists side_bets_round_id_idx on public.side_bets(round_id);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists hole_notes_user_id_idx on public.hole_notes(user_id);
create index if not exists round_plans_user_id_idx on public.round_plans(user_id);
create index if not exists photos_uploaded_by_idx on public.photos(uploaded_by);

alter table public.hole_notes
  drop constraint if exists hole_notes_hole_check;
alter table public.hole_notes
  add constraint hole_notes_hole_check check (hole between 1 and 18);

create or replace function public.increment_live_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;

-- Roster identity is user-editable and must never grant a privileged role.
drop trigger if exists grant_captain_on_roster_claim on public.profiles;
drop function if exists private.grant_captain_on_roster_claim();
drop function if exists public.grant_captain_on_roster_claim();

-- Retire legacy privilege bootstraps without rewriting published migrations.
drop trigger if exists bootstrap_first_admin on public.profiles;
drop function if exists private.bootstrap_first_admin();
drop function if exists public.claim_first_admin();
drop function if exists public.admin_exists();

update public.rounds
set format = 'Scramble / Modified Alternate Shot',
    format_detail = '4 scramble points + 4 modified alternate shot points'
where slug = 'friday';

update public.rounds
set format_detail = 'Full team match play; each 9 and total score worth 2 points (2 / 2 / 2)'
where slug = 'saturday';

update public.side_bets
set amount = 100,
    hole = null,
    label = case sort_order
      when 1 then 'CTP - Friday front'
      when 2 then 'CTP - Friday back'
      when 3 then 'CTP - Saturday front'
      when 4 then 'CTP - Saturday back'
      when 5 then 'CTP - Sunday front'
      when 6 then 'CTP - Sunday back'
      when 7 then 'Long Drive - Friday'
      when 8 then 'Long Drive - Saturday'
      else label
    end
where kind in ('ctp', 'ld');

update public.matches as m
set side_a = v.side_a,
    side_b = v.side_b
from (
  values
    ('Scramble Match 1', 'Zack / Chris', 'Charles / Blake'),
    ('Scramble Match 2', 'Nick / Andrew', 'Neil / Mike'),
    ('Scramble Match 3', 'Kevin / Max', 'Dan / Josef'),
    ('Scramble Match 4', 'Seth / Keenan', 'Casey / Barry'),
    ('Alt Shot Match 1', 'Zack / Chris', 'Charles / Blake'),
    ('Alt Shot Match 2', 'Nick / Andrew', 'Neil / Mike'),
    ('Alt Shot Match 3', 'Kevin / Max', 'Dan / Josef'),
    ('Alt Shot Match 4', 'Seth / Keenan', 'Casey / Barry')
) as v(label, side_a, side_b)
join public.rounds as r on r.slug = 'friday'
where m.round_id = r.id and m.label = v.label;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault', 'vault', false, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Upsert needs SELECT + INSERT + UPDATE; ownership remains immutable.
drop policy if exists "vault update" on storage.objects;
create policy "vault update" on storage.objects
for update to authenticated
using (bucket_id = 'vault' and owner = (select auth.uid()))
with check (bucket_id = 'vault' and owner = (select auth.uid()));
