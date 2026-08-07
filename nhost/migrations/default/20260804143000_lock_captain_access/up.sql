-- Roster identity is user-editable and must never grant a privileged role.
-- Captain/admin access is managed through /admin or the server-only email allowlist.
DROP TRIGGER IF EXISTS grant_captain_on_roster_claim ON public.profiles;
DROP FUNCTION IF EXISTS public.grant_captain_on_roster_claim();
