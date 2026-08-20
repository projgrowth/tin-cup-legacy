-- Complete engagement platform. Additive only; official scoring tables and authority are unchanged.

alter table public.story_comments
  add column if not exists announcement_expires_at timestamptz;

create or replace function private.protect_story_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.pinned_at is not null or new.pinned_by is not null or new.announcement_expires_at is not null)
     and not private.is_scorekeeper(auth.uid()) then
    if tg_op = 'INSERT' or (new.pinned_at, new.pinned_by, new.announcement_expires_at)
      is distinct from (old.pinned_at, old.pinned_by, old.announcement_expires_at) then
      raise exception 'Only captains and admins can publish announcements.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_story_announcement on public.story_comments;
create trigger protect_story_announcement before insert or update on public.story_comments
for each row execute function private.protect_story_announcement();
create policy "organizers publish announcements" on public.story_comments for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_scorekeeper((select auth.uid())));

create or replace function private.enqueue_organizer_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.moment_key = 'clubhouse:main' and new.pinned_at is not null
     and (tg_op = 'INSERT' or old.pinned_at is distinct from new.pinned_at) then
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
create trigger organizer_announcement_outbox after insert or update on public.story_comments
for each row execute function private.enqueue_organizer_announcement();

create or replace function private.enqueue_mention_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare moment text;
begin
  select moment_key into moment from public.story_comments where id = new.comment_id;
  insert into public.notification_outbox(kind, dedupe_key, recipient_id, payload)
  values(
    'mention',
    'mention:' || new.comment_id || ':' || new.mentioned_user_id,
    new.mentioned_user_id,
    jsonb_build_object(
      'commentId', new.comment_id,
      'url', case when moment = 'clubhouse:main'
        then '/?feed=clubhouse&post=' || new.comment_id
        else '/?feed=all&post=' || moment || '&comment=' || new.comment_id end
    )
  ) on conflict(dedupe_key) do nothing;
  return new;
end $$;

alter table public.user_experience_preferences
  add column if not exists layout_mode text not null default 'auto'
    check (layout_mode in ('auto', 'custom'));

alter table public.notification_preferences
  add column if not exists quiet_start time,
  add column if not exists quiet_end time,
  add column if not exists timezone text;

alter table public.photos
  add column if not exists course_id text,
  add column if not exists round_id uuid references public.rounds(id) on delete set null,
  add column if not exists event_tag text,
  add column if not exists featured boolean not null default false,
  add column if not exists alt_text text,
  add constraint photos_alt_text_length check (alt_text is null or length(alt_text) <= 180);

create table if not exists public.clubhouse_polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closes_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null,
  check (closes_at is null or closes_at > created_at)
);

create table if not exists public.clubhouse_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.clubhouse_polls(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 60),
  sort_order integer not null default 0,
  unique(poll_id, id)
);

create table if not exists public.clubhouse_poll_votes (
  poll_id uuid not null references public.clubhouse_polls(id) on delete cascade,
  option_id uuid not null references public.clubhouse_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(poll_id, user_id)
);

create table if not exists public.player_checkins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('on-course', 'clubhouse', 'heading-dinner', 'done-today')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at and expires_at <= created_at + interval '6 hours 5 minutes')
);

create table if not exists public.engagement_prompts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo', 'conversation')),
  title text not null check (length(trim(title)) between 1 and 100),
  detail text check (detail is null or length(detail) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  round_id uuid references public.rounds(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.photo_favorites (
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(photo_id, user_id)
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null check (name in (
    'home_action', 'clubhouse_post', 'poll_created', 'poll_voted', 'checkin_changed',
    'gallery_opened', 'calendar_downloaded', 'notification_opt_in', 'notification_test',
    'pwa_install', 'offline_conflict'
  )),
  route text not null check (length(route) between 1 and 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_object_length(metadata) <= 5)
);

create table if not exists public.notification_delivery_receipts (
  outbox_id uuid not null references public.notification_outbox(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key(outbox_id, subscription_id)
);

create table if not exists public.client_error_events (
  id uuid primary key default gen_random_uuid(),
  route text not null check (length(route) between 1 and 120),
  release text not null check (length(release) between 1 and 80),
  browser_category text not null check (length(browser_category) between 1 and 40),
  message text not null check (length(message) between 1 and 240),
  stack_excerpt text check (stack_excerpt is null or length(stack_excerpt) <= 600),
  session_hash text not null check (length(session_hash) = 64),
  created_at timestamptz not null default now()
);

alter table public.clubhouse_polls enable row level security;
alter table public.clubhouse_poll_options enable row level security;
alter table public.clubhouse_poll_votes enable row level security;
alter table public.player_checkins enable row level security;
alter table public.engagement_prompts enable row level security;
alter table public.photo_favorites enable row level security;
alter table public.product_events enable row level security;
alter table public.notification_delivery_receipts enable row level security;
alter table public.client_error_events enable row level security;

grant select on public.clubhouse_polls, public.clubhouse_poll_options, public.clubhouse_poll_votes to anon, authenticated;
grant insert, update, delete on public.clubhouse_polls, public.clubhouse_poll_options, public.clubhouse_poll_votes to authenticated;
grant select, insert, update, delete on public.player_checkins, public.photo_favorites to authenticated;
grant select on public.engagement_prompts to anon, authenticated;
grant insert, update, delete on public.engagement_prompts to authenticated;
grant insert on public.product_events to anon, authenticated;
grant select on public.product_events to authenticated, service_role;
grant select, insert on public.notification_delivery_receipts to service_role;
grant select, insert on public.client_error_events to service_role;
grant select on public.client_error_events to authenticated;
create policy "organizers read sanitized client errors" on public.client_error_events for select to authenticated
using (private.is_scorekeeper((select auth.uid())));

create policy "public reads active polls" on public.clubhouse_polls for select
using (deleted_at is null);
create policy "claimed players create polls" on public.clubhouse_polls for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_claimed_player((select auth.uid())));
create policy "authors close polls" on public.clubhouse_polls for update to authenticated
using (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())))
with check (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));
create policy "authors delete polls" on public.clubhouse_polls for delete to authenticated
using (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));

create policy "public reads poll options" on public.clubhouse_poll_options for select using (true);
create policy "poll authors create options" on public.clubhouse_poll_options for insert to authenticated
with check (exists(
  select 1 from public.clubhouse_polls p
  where p.id = poll_id and p.author_id = (select auth.uid()) and p.deleted_at is null
));
create policy "poll authors manage options" on public.clubhouse_poll_options for update to authenticated
using (exists(select 1 from public.clubhouse_polls p where p.id = poll_id and p.author_id = (select auth.uid())));
create policy "poll authors remove options" on public.clubhouse_poll_options for delete to authenticated
using (exists(select 1 from public.clubhouse_polls p where p.id = poll_id and p.author_id = (select auth.uid())));

create or replace function private.can_view_poll_votes(_poll_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.clubhouse_polls p
    where p.id = _poll_id and (p.closed_at is not null or p.closes_at <= now())
  ) or exists(
    select 1 from public.clubhouse_poll_votes v where v.poll_id = _poll_id and v.user_id = _user_id
  )
$$;
revoke all on function private.can_view_poll_votes(uuid, uuid) from public, anon;
grant execute on function private.can_view_poll_votes(uuid, uuid) to authenticated, service_role;

create policy "poll results unlock after voting" on public.clubhouse_poll_votes for select
using (private.can_view_poll_votes(poll_id, (select auth.uid())));
create policy "claimed players vote in open polls" on public.clubhouse_poll_votes for insert to authenticated
with check (
  user_id = (select auth.uid()) and private.is_claimed_player((select auth.uid()))
  and exists(
    select 1 from public.clubhouse_polls p
    where p.id = poll_id and p.deleted_at is null and p.closed_at is null
      and (p.closes_at is null or p.closes_at > now())
  )
  and exists(select 1 from public.clubhouse_poll_options o where o.id = option_id and o.poll_id = poll_id)
);
create policy "owners change open votes" on public.clubhouse_poll_votes for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists(select 1 from public.clubhouse_polls p where p.id = poll_id and p.closed_at is null and (p.closes_at is null or p.closes_at > now()))
  and exists(select 1 from public.clubhouse_poll_options o where o.id = option_id and o.poll_id = poll_id)
);

create policy "claimed players read checkins" on public.player_checkins for select to authenticated
using (private.is_claimed_player((select auth.uid())) or private.is_scorekeeper((select auth.uid())));
create policy "owners create checkins" on public.player_checkins for insert to authenticated
with check (
  user_id = (select auth.uid()) and expires_at <= now() + interval '6 hours 5 minutes'
  and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.player_id = player_id)
);
create policy "owners update checkins" on public.player_checkins for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and expires_at <= now() + interval '6 hours 5 minutes');
create policy "owners remove checkins" on public.player_checkins for delete to authenticated
using (user_id = (select auth.uid()));

create policy "public reads prompts" on public.engagement_prompts for select using (true);
create policy "organizers create prompts" on public.engagement_prompts for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_scorekeeper((select auth.uid())));
create policy "organizers update prompts" on public.engagement_prompts for update to authenticated
using (private.is_scorekeeper((select auth.uid()))) with check (private.is_scorekeeper((select auth.uid())));
create policy "organizers remove prompts" on public.engagement_prompts for delete to authenticated
using (private.is_scorekeeper((select auth.uid())));

create policy "owners read favorites" on public.photo_favorites for select to authenticated
using (user_id = (select auth.uid()));
create policy "owners add favorites" on public.photo_favorites for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "owners remove favorites" on public.photo_favorites for delete to authenticated
using (user_id = (select auth.uid()));

create policy "clients insert content-free analytics" on public.product_events for insert
with check (
  (user_id is null or user_id = (select auth.uid()))
  and not (metadata ?| array['body', 'comment', 'email', 'name', 'location', 'photo', 'caption'])
);
create policy "organizers read product analytics" on public.product_events for select to authenticated
using (private.is_scorekeeper((select auth.uid())));

create or replace function private.enforce_engagement_rate()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent_count integer;
begin
  if tg_table_name = 'clubhouse_polls' then
    select count(*) into recent_count from public.clubhouse_polls
    where author_id = new.author_id and created_at > now() - interval '2 minutes';
  elsif tg_table_name = 'player_checkins' then
    select count(*) into recent_count from public.player_checkins
    where user_id = new.user_id and created_at > now() - interval '2 minutes';
  else
    recent_count := 0;
  end if;
  if recent_count >= 5 then
    raise exception 'Engagement limit reached. Try again in a moment.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists clubhouse_poll_rate on public.clubhouse_polls;
create trigger clubhouse_poll_rate before insert on public.clubhouse_polls
for each row execute function private.enforce_engagement_rate();
drop trigger if exists player_checkin_rate on public.player_checkins;
create trigger player_checkin_rate before insert on public.player_checkins
for each row execute function private.enforce_engagement_rate();

drop trigger if exists clubhouse_polls_touch on public.clubhouse_polls;
create trigger clubhouse_polls_touch before update on public.clubhouse_polls
for each row execute function public.touch_updated_at();
drop trigger if exists clubhouse_poll_votes_touch on public.clubhouse_poll_votes;
create trigger clubhouse_poll_votes_touch before update on public.clubhouse_poll_votes
for each row execute function public.touch_updated_at();

create index if not exists clubhouse_polls_active_idx on public.clubhouse_polls(deleted_at, created_at desc);
create index if not exists clubhouse_poll_votes_poll_idx on public.clubhouse_poll_votes(poll_id);
create index if not exists player_checkins_expiry_idx on public.player_checkins(expires_at);
create index if not exists engagement_prompts_window_idx on public.engagement_prompts(starts_at, ends_at);
create index if not exists product_events_name_created_idx on public.product_events(name, created_at desc);
create index if not exists client_error_events_rate_idx on public.client_error_events(session_hash, created_at desc);
