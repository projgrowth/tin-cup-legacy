-- Social-first Home, controlled personalization, predictions, and confirmations.
-- Additive only: official match result columns and scoring authority are unchanged.

alter table public.profiles
  add column if not exists status_text text,
  add column if not exists flair text;

alter table public.profiles drop constraint if exists profiles_status_text_check;
alter table public.profiles add constraint profiles_status_text_check
  check (status_text is null or length(trim(status_text)) between 1 and 80);
alter table public.profiles drop constraint if exists profiles_flair_check;
alter table public.profiles add constraint profiles_flair_check
  check (flair is null or flair in ('competitor', 'vibes', 'strategist', 'rookie'));

alter table public.notification_preferences
  add column if not exists organizer_announcements boolean not null default true,
  add column if not exists match_reviews boolean not null default true;

create table if not exists public.user_experience_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance text not null default 'heritage'
    check (appearance in ('heritage', 'night', 'team')),
  home_modules text[] not null default array['upcoming', 'plan', 'photos', 'purse']::text[],
  compact_feed boolean not null default false,
  updated_at timestamptz not null default now(),
  check (home_modules <@ array['upcoming', 'plan', 'photos', 'purse']::text[])
);
alter table public.user_experience_preferences enable row level security;
grant select, insert, update, delete on public.user_experience_preferences to authenticated;
create policy "owners manage experience preferences" on public.user_experience_preferences
for all to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

alter table public.story_comments
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create table if not exists public.story_reports (
  comment_id uuid not null references public.story_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'review' check (reason in ('review', 'harassment', 'spam')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  primary key(comment_id, reporter_id)
);
alter table public.story_reports enable row level security;
grant select, insert, update on public.story_reports to authenticated;
create policy "claimed players report posts" on public.story_reports for insert to authenticated
with check (reporter_id = (select auth.uid()) and private.is_claimed_player((select auth.uid())));
create policy "reporters and moderators read reports" on public.story_reports for select to authenticated
using (reporter_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));
create policy "moderators resolve reports" on public.story_reports for update to authenticated
using (private.is_scorekeeper((select auth.uid())))
with check (private.is_scorekeeper((select auth.uid())));

create table if not exists public.clubhouse_reads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now()
);
alter table public.clubhouse_reads enable row level security;
grant select, insert, update on public.clubhouse_reads to authenticated;
create policy "owners manage clubhouse read cursor" on public.clubhouse_reads for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function private.enforce_clubhouse_post_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moment_key = 'clubhouse:main' and (
    select count(*) from public.story_comments
    where author_id = new.author_id
      and moment_key = 'clubhouse:main'
      and deleted_at is null
      and created_at > now() - interval '2 minutes'
  ) >= 5 then
    raise exception 'Clubhouse posting limit reached. Try again in a moment.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists clubhouse_post_rate on public.story_comments;
create trigger clubhouse_post_rate before insert on public.story_comments
for each row execute function private.enforce_clubhouse_post_rate();

create or replace function private.protect_story_pin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.pinned_at, new.pinned_by) is distinct from (old.pinned_at, old.pinned_by)
     and not private.is_scorekeeper(auth.uid()) then
    raise exception 'Only captains and admins can pin Clubhouse announcements.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists protect_story_pin on public.story_comments;
create trigger protect_story_pin before update on public.story_comments
for each row execute function private.protect_story_pin();

create table if not exists public.match_predictions (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('side-a', 'halved', 'side-b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(match_id, user_id)
);
alter table public.match_predictions enable row level security;
grant select on public.match_predictions to anon, authenticated;
grant insert, update, delete on public.match_predictions to authenticated;

create or replace function private.can_view_match_predictions(_match_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.matches m where m.id = _match_id and m.result <> 'pending')
    or exists(select 1 from public.match_predictions p where p.match_id = _match_id and p.user_id = _user_id)
$$;
revoke all on function private.can_view_match_predictions(uuid, uuid) from public, anon;
grant execute on function private.can_view_match_predictions(uuid, uuid) to authenticated, service_role;

create policy "prediction aggregates unlock after voting" on public.match_predictions for select
using (private.can_view_match_predictions(match_id, (select auth.uid())));
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

create or replace function private.player_is_in_match(_match_id uuid, _player_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.matches m join public.players p on p.id = _player_id
    where m.id = _match_id and lower(trim(p.name)) = any(
      regexp_split_to_array(lower(coalesce(m.side_a, '') || '/' || coalesce(m.side_b, '')), '\s*/\s*')
    )
  )
$$;
revoke all on function private.player_is_in_match(uuid, uuid) from public, anon;
grant execute on function private.player_is_in_match(uuid, uuid) to authenticated, service_role;

create table if not exists public.match_confirmations (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state in ('confirmed', 'needs-review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(match_id, player_id),
  unique(match_id, user_id)
);
alter table public.match_confirmations enable row level security;
grant select on public.match_confirmations to anon, authenticated;
grant insert, update on public.match_confirmations to authenticated;
create policy "match confirmation status public read" on public.match_confirmations for select using (true);
create policy "participants confirm posted results" on public.match_confirmations for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.player_id = player_id)
  and private.player_is_in_match(match_id, player_id)
  and exists(select 1 from public.matches m where m.id = match_id and m.result <> 'pending')
);
create policy "participants update confirmation" on public.match_confirmations for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.player_is_in_match(match_id, player_id)
  and exists(select 1 from public.matches m where m.id = match_id and m.result <> 'pending')
);

create index if not exists story_comments_clubhouse_idx
  on public.story_comments(moment_key, pinned_at desc, created_at desc);
create index if not exists match_predictions_match_idx on public.match_predictions(match_id);
create index if not exists match_confirmations_match_idx on public.match_confirmations(match_id, state);

-- Existing mention notifications cover Clubhouse mentions. Add review escalation only.
alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox add constraint notification_outbox_kind_check
  check (kind in ('tee_reminder', 'my_match', 'mention', 'lead_change', 'final_result', 'organizer_announcement', 'match_review'));

create or replace function private.enqueue_organizer_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moment_key = 'clubhouse:main' and new.pinned_at is not null
     and (old.pinned_at is distinct from new.pinned_at) then
    insert into public.notification_outbox(kind, dedupe_key, payload)
    values(
      'organizer_announcement',
      'announcement:' || new.id || ':' || extract(epoch from new.pinned_at),
      jsonb_build_object('commentId', new.id, 'body', left(new.body, 180), 'url', '/?feed=clubhouse&post=' || new.id)
    ) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists organizer_announcement_outbox on public.story_comments;
create trigger organizer_announcement_outbox after update on public.story_comments
for each row execute function private.enqueue_organizer_announcement();

create or replace function private.enqueue_match_review_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.state = 'needs-review' and (tg_op = 'INSERT' or old.state is distinct from new.state) then
    insert into public.notification_outbox(kind, dedupe_key, payload)
    values(
      'match_review',
      'match-review:' || new.match_id || ':' || new.player_id || ':' || extract(epoch from new.updated_at),
      jsonb_build_object('matchId', new.match_id, 'url', '/?feed=scores&post=match:' || new.match_id)
    ) on conflict(dedupe_key) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists match_confirmation_review_outbox on public.match_confirmations;
create trigger match_confirmation_review_outbox after insert or update on public.match_confirmations
for each row execute function private.enqueue_match_review_notification();

drop trigger if exists experience_preferences_touch on public.user_experience_preferences;
create trigger experience_preferences_touch before update on public.user_experience_preferences
for each row execute function public.touch_updated_at();
drop trigger if exists match_predictions_touch on public.match_predictions;
create trigger match_predictions_touch before update on public.match_predictions
for each row execute function public.touch_updated_at();
drop trigger if exists match_confirmations_touch on public.match_confirmations;
create trigger match_confirmations_touch before update on public.match_confirmations
for each row execute function public.touch_updated_at();
