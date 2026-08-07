-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'captain', 'player');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_scorekeeper(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'captain')
  )
$$;

CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  captain_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams public read" ON public.teams FOR SELECT USING (true);

-- players
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_captain boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.players TO anon;
GRANT SELECT ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players public read" ON public.players FOR SELECT USING (true);

-- rounds
CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  day_label text NOT NULL,
  play_date date NOT NULL,
  course text NOT NULL,
  tee_window text NOT NULL,
  format text NOT NULL,
  format_detail text,
  points int NOT NULL DEFAULT 0,
  meal text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.rounds TO anon;
GRANT SELECT ON public.rounds TO authenticated;
GRANT ALL ON public.rounds TO service_role;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rounds public read" ON public.rounds FOR SELECT USING (true);

-- matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  label text NOT NULL,
  points numeric NOT NULL DEFAULT 1,
  result text NOT NULL DEFAULT 'pending',
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_result_check CHECK (result IN ('pending','strong-mental','grass-roots','halved'))
);
GRANT SELECT ON public.matches TO anon;
GRANT SELECT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches public read" ON public.matches FOR SELECT USING (true);
CREATE POLICY "scorekeepers update matches" ON public.matches
  FOR UPDATE TO authenticated
  USING (public.is_scorekeeper(auth.uid()))
  WITH CHECK (public.is_scorekeeper(auth.uid()));

-- side bets
CREATE TABLE public.side_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  label text NOT NULL,
  round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
  hole int,
  amount numeric NOT NULL DEFAULT 0,
  player_name text,
  team_slug text,
  distance text,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT side_bets_kind_check CHECK (kind IN ('ctp','ld'))
);
GRANT SELECT ON public.side_bets TO anon;
GRANT SELECT, UPDATE ON public.side_bets TO authenticated;
GRANT ALL ON public.side_bets TO service_role;
ALTER TABLE public.side_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "side bets public read" ON public.side_bets FOR SELECT USING (true);
CREATE POLICY "scorekeepers update side bets" ON public.side_bets
  FOR UPDATE TO authenticated
  USING (public.is_scorekeeper(auth.uid()))
  WITH CHECK (public.is_scorekeeper(auth.uid()));

-- photos
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.photos TO anon;
GRANT SELECT, INSERT, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos public read" ON public.photos FOR SELECT USING (true);
CREATE POLICY "signed in can add photos" ON public.photos
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "owners or scorekeepers delete photos" ON public.photos
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR public.is_scorekeeper(auth.uid()));

-- realtime
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.side_bets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.side_bets;

-- seed teams
INSERT INTO public.teams (slug, name, captain_name, sort_order) VALUES
  ('strong-mental', 'Team Strong Mental', 'Zack Smith', 1),
  ('grass-roots', 'Team Grass Roots', 'Charles Grass', 2);

INSERT INTO public.players (team_id, name, is_captain, sort_order)
SELECT t.id, v.name, v.is_captain, v.sort_order
FROM public.teams t
JOIN (VALUES
  ('strong-mental','Zack Smith',true,1),
  ('strong-mental','Chris Maher',false,2),
  ('strong-mental','Andrew Kezsbom',false,3),
  ('strong-mental','Nick Sears',false,4),
  ('strong-mental','Max Furth',false,5),
  ('strong-mental','Kevin Maher',false,6),
  ('strong-mental','Seth Beaver',false,7),
  ('strong-mental','Keenan Horrell',false,8),
  ('grass-roots','Charles Grass',true,1),
  ('grass-roots','Neil Candelora',false,2),
  ('grass-roots','Blake Weeks',false,3),
  ('grass-roots','Mike Maher',false,4),
  ('grass-roots','Dan Rodriguez',false,5),
  ('grass-roots','Josef Yehia',false,6),
  ('grass-roots','Casey Gillespie',false,7),
  ('grass-roots','Barry Rigby',false,8)
) AS v(team_slug, name, is_captain, sort_order) ON v.team_slug = t.slug;

INSERT INTO public.rounds (slug, day_label, play_date, course, tee_window, format, format_detail, points, meal, sort_order) VALUES
  ('friday', 'Friday', '2026-08-28', 'South Course', '12:19 - 12:44 PM', 'Scramble / Alt Shot', '4 scramble points + 4 alternate shot points', 8, 'Dinner: Salamander Grille', 1),
  ('saturday', 'Saturday', '2026-08-29', 'Copperhead Course', '9:54 - 10:20 AM', 'Modified Stableford Match Play', '2 / 2 / 2 breakdown across the round', 6, 'Dinner: 7 PM Steakhouse', 2),
  ('sunday', 'Sunday', '2026-08-30', 'Island Course', '9:54 - 10:20 AM', 'Shamble / Singles', '4 shamble points + 8 singles points', 12, 'Lunch & Awards Ceremony', 3);

INSERT INTO public.matches (round_id, label, points, sort_order)
SELECT r.id, v.label, v.points, v.sort_order
FROM public.rounds r
JOIN (VALUES
  ('friday','Scramble Match 1',1,1),('friday','Scramble Match 2',1,2),('friday','Scramble Match 3',1,3),('friday','Scramble Match 4',1,4),
  ('friday','Alt Shot Match 1',1,5),('friday','Alt Shot Match 2',1,6),('friday','Alt Shot Match 3',1,7),('friday','Alt Shot Match 4',1,8),
  ('saturday','Stableford Front 9',2,1),('saturday','Stableford Back 9',2,2),('saturday','Stableford Overall',2,3),
  ('sunday','Shamble Match 1',1,1),('sunday','Shamble Match 2',1,2),('sunday','Shamble Match 3',1,3),('sunday','Shamble Match 4',1,4),
  ('sunday','Singles Match 1',1,5),('sunday','Singles Match 2',1,6),('sunday','Singles Match 3',1,7),('sunday','Singles Match 4',1,8),
  ('sunday','Singles Match 5',1,9),('sunday','Singles Match 6',1,10),('sunday','Singles Match 7',1,11),('sunday','Singles Match 8',1,12)
) AS v(round_slug, label, points, sort_order) ON v.round_slug = r.slug;

INSERT INTO public.side_bets (kind, label, round_id, hole, amount, sort_order)
SELECT v.kind, v.label, r.id, v.hole, v.amount, v.sort_order
FROM public.rounds r
JOIN (VALUES
  ('ctp','CTP - Friday front','friday',NULL,100,1),
  ('ctp','CTP - Friday back','friday',NULL,100,2),
  ('ctp','CTP - Saturday front','saturday',NULL,100,3),
  ('ctp','CTP - Saturday back','saturday',NULL,100,4),
  ('ctp','CTP - Sunday front','sunday',NULL,100,5),
  ('ctp','CTP - Sunday back','sunday',NULL,100,6),
  ('ld','Long Drive - Friday','friday',NULL,100,7),
  ('ld','Long Drive - Saturday','saturday',NULL,100,8)
) AS v(kind, label, round_slug, hole, amount, sort_order) ON v.round_slug = r.slug;