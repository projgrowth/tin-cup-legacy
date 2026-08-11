drop policy if exists "own roles readable" on public.user_roles;
drop policy if exists "admins manage roles" on public.user_roles;
create policy "roles readable by owner or admin" on public.user_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "admins insert roles" on public.user_roles
for insert to authenticated
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "admins update roles" on public.user_roles
for update to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "admins delete roles" on public.user_roles
for delete to authenticated
using (private.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own hole notes" on public.hole_notes;
create policy "own hole notes" on public.hole_notes
for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own round plans" on public.round_plans;
create policy "own round plans" on public.round_plans
for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "scorekeepers update matches" on public.matches;
create policy "scorekeepers update matches" on public.matches
for update to authenticated
using (private.is_scorekeeper((select auth.uid())))
with check (private.is_scorekeeper((select auth.uid())));
drop policy if exists "scorekeepers update side bets" on public.side_bets;
create policy "scorekeepers update side bets" on public.side_bets
for update to authenticated
using (private.is_scorekeeper((select auth.uid())))
with check (private.is_scorekeeper((select auth.uid())));
drop policy if exists "scorekeepers update trophies" on public.trophies;
create policy "scorekeepers update trophies" on public.trophies
for update to authenticated
using (private.is_scorekeeper((select auth.uid())))
with check (private.is_scorekeeper((select auth.uid())));

drop policy if exists "signed in can add photos" on public.photos;
create policy "signed in can add photos" on public.photos
for insert to authenticated with check (uploaded_by = (select auth.uid()));
drop policy if exists "owners or scorekeepers delete photos" on public.photos;
create policy "owners or scorekeepers delete photos" on public.photos
for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  or private.is_scorekeeper((select auth.uid()))
);

drop policy if exists "vault read" on storage.objects;
create policy "vault read" on storage.objects
for select to authenticated
using (
  bucket_id = 'vault'
  and (
    owner = (select auth.uid())
    or private.is_scorekeeper((select auth.uid()))
    or exists (select 1 from public.photos p where p.storage_path = storage.objects.name)
  )
);
drop policy if exists "vault delete" on storage.objects;
create policy "vault delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'vault'
  and (
    owner = (select auth.uid())
    or private.is_scorekeeper((select auth.uid()))
  )
);
