-- Field hangout: comments, reactions, reports, read cursor.
-- Self-contained for boards that never received 20260818010000 social SQL.
-- Does not change official scoring tables or captain authority.

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
  moderated_by uuid references auth.users(id) on delete set null,
  pinned_at timestamptz,
  pinned_by uuid references auth.users(id) on delete set null,
  announcement_expires_at timestamptz
);
alter table public.story_comments
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null,
  add column if not exists announcement_expires_at timestamptz;
create index if not exists story_comments_moment_created_idx
  on public.story_comments(moment_key, created_at);
alter table public.story_comments enable row level security;
grant select on public.story_comments to anon, authenticated;
grant insert, update, delete on public.story_comments to authenticated;
drop policy if exists "story comments public read" on public.story_comments;
drop policy if exists "claimed players comment" on public.story_comments;
drop policy if exists "authors or moderators edit comments" on public.story_comments;
drop policy if exists "authors or moderators delete comments" on public.story_comments;
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
drop policy if exists "story reactions public read" on public.story_reactions;
drop policy if exists "claimed players react" on public.story_reactions;
drop policy if exists "owners remove reactions" on public.story_reactions;
create policy "story reactions public read" on public.story_reactions for select using (true);
create policy "claimed players react" on public.story_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and private.is_claimed_player((select auth.uid())));
create policy "owners remove reactions" on public.story_reactions for delete to authenticated
using (user_id = (select auth.uid()) or private.is_scorekeeper((select auth.uid())));

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
drop policy if exists "claimed players report posts" on public.story_reports;
drop policy if exists "reporters and moderators read reports" on public.story_reports;
drop policy if exists "moderators resolve reports" on public.story_reports;
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
drop policy if exists "owners manage clubhouse read cursor" on public.clubhouse_reads;
create policy "owners manage clubhouse read cursor" on public.clubhouse_reads for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'story_reactions'
  ) then
    alter publication supabase_realtime add table public.story_reactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'story_comments'
  ) then
    alter publication supabase_realtime add table public.story_comments;
  end if;
end $$;

notify pgrst, 'reload schema';
