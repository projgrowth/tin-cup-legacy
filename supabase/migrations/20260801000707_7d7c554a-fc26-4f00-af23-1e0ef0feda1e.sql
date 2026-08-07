alter table public.trophies replica identity full;
alter table public.photos replica identity full;
alter publication supabase_realtime add table public.trophies;