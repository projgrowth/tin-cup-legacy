-- Additive social, audit, and notification platform. No tournament scoring columns change.
create or replace function private.is_claimed_player(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = _user_id and player_id is not null)
$$;
revoke all on function private.is_claimed_player(uuid) from public, anon;
grant execute on function private.is_claimed_player(uuid) to authenticated, service_role;

create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  moment_key text not null check (length(moment_key) between 3 and 180),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  moderated_by uuid references auth.users(id) on delete set null
);
create index if not exists story_comments_moment_created_idx on public.story_comments(moment_key, created_at);
alter table public.story_comments enable row level security;
grant select on public.story_comments to anon, authenticated;
grant insert, update, delete on public.story_comments to authenticated;
create policy "story comments public read" on public.story_comments for select
using (deleted_at is null or author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));
create policy "claimed players comment" on public.story_comments for insert to authenticated
with check (author_id = (select auth.uid()) and private.is_claimed_player((select auth.uid())));
create policy "authors or moderators edit comments" on public.story_comments for update to authenticated
using (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())))
with check (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));
create policy "authors or moderators delete comments" on public.story_comments for delete to authenticated
using (author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));

create table if not exists public.story_reactions (
  moment_key text not null check (length(moment_key) between 3 and 180),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('applause', 'fire', 'trophy')),
  created_at timestamptz not null default now(),
  primary key(moment_key, user_id, kind)
);
alter table public.story_reactions enable row level security;
grant select on public.story_reactions to anon, authenticated;
grant insert, delete on public.story_reactions to authenticated;
create policy "story reactions public read" on public.story_reactions for select using (true);
create policy "claimed players react" on public.story_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_claimed_player((select auth.uid())));
create policy "owners remove reactions" on public.story_reactions for delete to authenticated
using (user_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));

create table if not exists public.comment_mentions (
  comment_id uuid not null references public.story_comments(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(comment_id, mentioned_user_id)
);
alter table public.comment_mentions enable row level security;
grant select, insert, delete on public.comment_mentions to authenticated;
create policy "signed in read mentions" on public.comment_mentions for select to authenticated using (true);
create policy "comment authors add mentions" on public.comment_mentions for insert to authenticated
with check (exists(select 1 from public.story_comments c where c.id = comment_id and c.author_id = (select auth.uid())));
create policy "comment authors remove mentions" on public.comment_mentions for delete to authenticated
using (exists(select 1 from public.story_comments c where c.id = comment_id and (c.author_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())))));

create table if not exists public.score_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('match', 'side_bet', 'trophy')),
  entity_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  before_state jsonb not null,
  after_state jsonb not null,
  revision integer,
  created_at timestamptz not null default now()
);
create index if not exists score_history_entity_idx on public.score_history(entity_type, entity_id, created_at desc);
alter table public.score_history enable row level security;
grant select on public.score_history to authenticated;
create policy "scorekeepers read score history" on public.score_history for select to authenticated
using (private.is_scorekeeper((select auth.uid())));

create or replace function private.capture_tournament_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare kind text;
begin
  kind := case tg_table_name when 'matches' then 'match' when 'side_bets' then 'side_bet' else 'trophy' end;
  insert into public.score_history(entity_type, entity_id, actor_id, before_state, after_state, revision)
  values(kind, new.id, auth.uid(), to_jsonb(old), to_jsonb(new), new.revision);
  return new;
end $$;
drop trigger if exists matches_history on public.matches;
create trigger matches_history after update on public.matches for each row execute function private.capture_tournament_history();
drop trigger if exists side_bets_history on public.side_bets;
create trigger side_bets_history after update on public.side_bets for each row execute function private.capture_tournament_history();
drop trigger if exists trophies_history on public.trophies;
create trigger trophies_history after update on public.trophies for each row execute function private.capture_tournament_history();

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  failure_count integer not null default 0,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
create policy "owners manage push subscriptions" on public.push_subscriptions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tee_reminders boolean not null default true,
  my_match boolean not null default true,
  mentions boolean not null default true,
  lead_changes boolean not null default true,
  final_result boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
grant select, insert, update, delete on public.notification_preferences to authenticated;
create policy "owners manage notification preferences" on public.notification_preferences for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('tee_reminder', 'my_match', 'mention', 'lead_change', 'final_result')),
  dedupe_key text not null unique,
  recipient_id uuid references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notification_outbox_dispatch_idx on public.notification_outbox(status, available_at);
alter table public.notification_outbox enable row level security;
grant all on public.notification_outbox to service_role;
grant select on public.notification_outbox to authenticated;
grant update(status, available_at, last_error) on public.notification_outbox to authenticated;
create policy "scorekeepers inspect notification outbox" on public.notification_outbox for select to authenticated
using (private.is_scorekeeper((select auth.uid())));
create policy "scorekeepers retry failed notifications" on public.notification_outbox for update to authenticated
using (status = 'failed' and private.is_scorekeeper((select auth.uid())))
with check (status = 'pending' and private.is_scorekeeper((select auth.uid())));

create or replace function private.enqueue_match_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  strong_score numeric;
  grass_score numeric;
  old_strong_score numeric;
  old_grass_score numeric;
  board_revision bigint;
  current_leader text;
  previous_leader text;
  pending_count integer;
begin
  if new.result is distinct from old.result then
    insert into public.notification_outbox(kind, dedupe_key, payload)
    values('my_match', 'match:' || new.id || ':revision:' || new.revision, jsonb_build_object('matchId', new.id, 'result', new.result, 'url', '/'))
    on conflict(dedupe_key) do nothing;

    select
      coalesce(sum(case when result = 'strong-mental' then points when result = 'halved' then points / 2.0 else 0 end), 0),
      coalesce(sum(case when result = 'grass-roots' then points when result = 'halved' then points / 2.0 else 0 end), 0),
      coalesce(sum(revision), 0),
      count(*) filter (where result = 'pending')
    into strong_score, grass_score, board_revision, pending_count
    from public.matches;

    old_strong_score := strong_score
      - case when new.result = 'strong-mental' then new.points when new.result = 'halved' then new.points / 2.0 else 0 end
      + case when old.result = 'strong-mental' then old.points when old.result = 'halved' then old.points / 2.0 else 0 end;
    old_grass_score := grass_score
      - case when new.result = 'grass-roots' then new.points when new.result = 'halved' then new.points / 2.0 else 0 end
      + case when old.result = 'grass-roots' then old.points when old.result = 'halved' then old.points / 2.0 else 0 end;
    current_leader := case when strong_score > grass_score then 'strong-mental' when grass_score > strong_score then 'grass-roots' else null end;
    previous_leader := case when old_strong_score > old_grass_score then 'strong-mental' when old_grass_score > old_strong_score then 'grass-roots' else null end;

    if current_leader is not null and current_leader is distinct from previous_leader then
      insert into public.notification_outbox(kind, dedupe_key, payload)
      values(
        'lead_change',
        'lead:' || current_leader || ':board:' || board_revision,
        jsonb_build_object('leader', current_leader, 'body', strong_score || '–' || grass_score, 'url', '/')
      ) on conflict(dedupe_key) do nothing;
    end if;

    if pending_count = 0 then
      insert into public.notification_outbox(kind, dedupe_key, payload)
      values(
        'final_result',
        'final:board:' || board_revision,
        jsonb_build_object('body', 'Final · ' || strong_score || '–' || grass_score, 'url', '/?board=true')
      ) on conflict(dedupe_key) do nothing;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists matches_notification_outbox on public.matches;
create trigger matches_notification_outbox after update on public.matches for each row execute function private.enqueue_match_notification();

create or replace function private.enqueue_mention_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_outbox(kind, dedupe_key, recipient_id, payload)
  values('mention', 'mention:' || new.comment_id || ':' || new.mentioned_user_id, new.mentioned_user_id, jsonb_build_object('commentId', new.comment_id, 'url', '/?story=1'))
  on conflict(dedupe_key) do nothing;
  return new;
end $$;
drop trigger if exists comment_mention_outbox on public.comment_mentions;
create trigger comment_mention_outbox after insert on public.comment_mentions for each row execute function private.enqueue_mention_notification();
