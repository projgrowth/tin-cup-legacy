-- Field social is public: claimed roster cards + published vault files.
-- Unclaimed profiles (email-only) stay owner-visible. Writes stay authenticated.

grant select on table public.profiles to anon;

drop policy if exists "profiles readable by signed in" on public.profiles;
drop policy if exists "claimed field cards public" on public.profiles;
drop policy if exists "own profile readable" on public.profiles;

create policy "claimed field cards public" on public.profiles
for select to anon, authenticated
using (player_id is not null);

create policy "own profile readable" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

-- Signed URLs for Pulse / avatars must work logged-out.
grant select on table storage.objects to anon, authenticated;

drop policy if exists "vault read" on storage.objects;
drop policy if exists "vault read published" on storage.objects;

create policy "vault read published" on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'vault'
  and (
    owner = (select auth.uid())
    or exists (
      select 1 from public.photos p where p.storage_path = name
    )
    or exists (
      select 1 from public.profiles pr
      where pr.avatar_path is not null and pr.avatar_path = name
    )
  )
);
