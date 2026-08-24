-- Player-authored most-likely questions. Votes reuse banter_votes.prompt_id text.

create table if not exists public.banter_prompts (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 80),
  chip text not null check (char_length(btrim(chip)) between 1 and 40),
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists banter_prompts_created_idx on public.banter_prompts(created_at desc);
alter table public.banter_prompts enable row level security;

create policy "banter prompts readable by signed-in"
on public.banter_prompts for select to authenticated
using (true);

create policy "claimed players insert own banter prompts"
on public.banter_prompts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and private.is_claimed_player((select auth.uid()))
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'banter_prompts'
  ) then
    alter publication supabase_realtime add table public.banter_prompts;
  end if;
end $$;
