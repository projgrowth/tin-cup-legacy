-- The first signed-in account must never become an administrator in a public
-- tournament app. Initial admin setup is now restricted to the server-side
-- INITIAL_ADMIN_EMAILS allowlist.
DROP TRIGGER IF EXISTS bootstrap_first_admin ON public.profiles;
DROP FUNCTION IF EXISTS private.bootstrap_first_admin();
DROP FUNCTION IF EXISTS public.claim_first_admin();
