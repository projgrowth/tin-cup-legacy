-- Documented one-shot: grant captain to whoever claimed Dan Rodriguez.
-- Player id from imported roster: adf688dc-6e21-426d-b3c5-23c690eaaa3a
-- Apply with supabase db push / SQL editor. Do not put service role in VITE_.

insert into public.user_roles (user_id, role)
select pr.id, 'captain'
from public.profiles pr
join public.players p on p.id = pr.player_id
where lower(p.name) = 'dan rodriguez'
   or p.id = 'adf688dc-6e21-426d-b3c5-23c690eaaa3a'
on conflict (user_id, role) do nothing;
