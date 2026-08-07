-- When a user claims a roster spot that is a captain (Zack / Charles),
-- automatically grant the captain scorekeeping role so event setup is one step shorter.

CREATE OR REPLACE FUNCTION private.grant_captain_on_roster_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.player_id IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR NEW.player_id IS DISTINCT FROM OLD.player_id
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.players
      WHERE id = NEW.player_id AND is_captain = true
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'captain')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_captain_on_roster_claim ON public.profiles;
CREATE TRIGGER grant_captain_on_roster_claim
AFTER INSERT OR UPDATE OF player_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.grant_captain_on_roster_claim();

REVOKE ALL ON FUNCTION private.grant_captain_on_roster_claim() FROM PUBLIC, anon;
