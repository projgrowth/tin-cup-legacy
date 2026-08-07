CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE UNIQUE INDEX profiles_player_id_key ON public.profiles(player_id) WHERE player_id IS NOT NULL;

CREATE TABLE public.hole_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  hole integer NOT NULL,
  tee_club text,
  target_line text,
  green_note text,
  target_score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, hole)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hole_notes TO authenticated;
GRANT ALL ON public.hole_notes TO service_role;
ALTER TABLE public.hole_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hole notes" ON public.hole_notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.round_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_slug text NOT NULL,
  plan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_plans TO authenticated;
GRANT ALL ON public.round_plans TO service_role;
ALTER TABLE public.round_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own round plans" ON public.round_plans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER hole_notes_touch BEFORE UPDATE ON public.hole_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER round_plans_touch BEFORE UPDATE ON public.round_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();