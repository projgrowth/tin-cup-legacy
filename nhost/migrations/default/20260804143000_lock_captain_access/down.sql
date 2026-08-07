CREATE OR REPLACE FUNCTION public.grant_captain_on_roster_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.player_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW.player_id IS DISTINCT FROM OLD.player_id) AND
     EXISTS (
       SELECT 1 FROM public.players
       WHERE id = NEW.player_id AND is_captain = true
     ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'captain')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_captain_on_roster_claim() FROM PUBLIC;

CREATE TRIGGER grant_captain_on_roster_claim
AFTER INSERT OR UPDATE OF player_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_captain_on_roster_claim();
