-- Monotonic optimistic-concurrency version for every live writable row.
-- A queued captain write only succeeds against the revision it originally observed.
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.side_bets ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.trophies ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_live_revision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS increment_match_revision ON public.matches;
CREATE TRIGGER increment_match_revision
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();

DROP TRIGGER IF EXISTS increment_side_bet_revision ON public.side_bets;
CREATE TRIGGER increment_side_bet_revision
BEFORE UPDATE ON public.side_bets
FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();

DROP TRIGGER IF EXISTS increment_trophy_revision ON public.trophies;
CREATE TRIGGER increment_trophy_revision
BEFORE UPDATE ON public.trophies
FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();
