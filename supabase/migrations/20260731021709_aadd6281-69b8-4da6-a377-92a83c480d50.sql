-- 1. Pairings on matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS side_a text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS side_b text;

-- 2. First signed-in profile becomes admin (bootstrap)
CREATE OR REPLACE FUNCTION private.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bootstrap_first_admin ON public.profiles;
CREATE TRIGGER bootstrap_first_admin
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.bootstrap_first_admin();

-- 3. Trophy room
CREATE TABLE IF NOT EXISTS public.trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  winner_name text,
  winner_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trophies TO anon;
GRANT SELECT, UPDATE ON public.trophies TO authenticated;
GRANT ALL ON public.trophies TO service_role;

ALTER TABLE public.trophies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trophies public read" ON public.trophies;
CREATE POLICY "trophies public read" ON public.trophies
FOR SELECT USING (true);

DROP POLICY IF EXISTS "scorekeepers update trophies" ON public.trophies;
CREATE POLICY "scorekeepers update trophies" ON public.trophies
FOR UPDATE TO authenticated
USING (private.is_scorekeeper(auth.uid()))
WITH CHECK (private.is_scorekeeper(auth.uid()));

DROP TRIGGER IF EXISTS touch_trophies ON public.trophies;
CREATE TRIGGER touch_trophies BEFORE UPDATE ON public.trophies
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.trophies (slug, name, description, sort_order) VALUES
  ('championship', 'Championship Trophy', 'Awarded to the winning side of the 26-point cup.', 0),
  ('chubbs-mvp', 'Chubbs Peterson MVP', 'Most points earned across the three rounds.', 1),
  ('steve-stinson-vibes', 'Steve Stinson Vibes Award', 'For the man who kept the vibes high all weekend.', 2),
  ('snake-pit', 'Snake Pit Trophy', 'Best play through Copperhead 16, 17 and 18.', 3)
ON CONFLICT (slug) DO NOTHING;

-- 4. Live photo gallery
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;