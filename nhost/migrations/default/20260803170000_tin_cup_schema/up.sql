CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'captain', 'player');

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  captain_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_captain boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  day_label text NOT NULL,
  play_date date NOT NULL,
  course text NOT NULL,
  tee_window text NOT NULL,
  format text NOT NULL,
  format_detail text,
  points integer NOT NULL DEFAULT 0,
  meal text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  label text NOT NULL,
  points numeric NOT NULL DEFAULT 1,
  result text NOT NULL DEFAULT 'pending',
  side_a text,
  side_b text,
  sort_order integer NOT NULL DEFAULT 0,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_result_check
    CHECK (result IN ('pending', 'strong-mental', 'grass-roots', 'halved'))
);

CREATE TABLE public.side_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  label text NOT NULL,
  round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
  hole integer,
  amount numeric NOT NULL DEFAULT 0,
  player_name text,
  team_slug text,
  distance text,
  sort_order integer NOT NULL DEFAULT 0,
  revision bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT side_bets_kind_check CHECK (kind IN ('ctp', 'ld'))
);

CREATE TABLE public.trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  winner_name text,
  winner_note text,
  sort_order integer NOT NULL DEFAULT 0,
  revision bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_player_id_key
  ON public.profiles(player_id) WHERE player_id IS NOT NULL;

CREATE TABLE public.hole_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  hole integer NOT NULL CHECK (hole BETWEEN 1 AND 18),
  tee_club text,
  target_line text,
  green_note text,
  target_score integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, hole)
);

CREATE TABLE public.round_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_slug text NOT NULL,
  plan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_slug)
);

CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX players_team_id_idx ON public.players(team_id);
CREATE INDEX matches_round_id_idx ON public.matches(round_id);
CREATE INDEX side_bets_round_id_idx ON public.side_bets(round_id);
CREATE INDEX user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX hole_notes_user_id_idx ON public.hole_notes(user_id);
CREATE INDEX round_plans_user_id_idx ON public.round_plans(user_id);
CREATE INDEX photos_uploaded_by_idx ON public.photos(uploaded_by);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_live_revision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.revision = OLD.revision + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER hole_notes_touch BEFORE UPDATE ON public.hole_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER round_plans_touch BEFORE UPDATE ON public.round_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trophies_touch BEFORE UPDATE ON public.trophies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER increment_match_revision BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();
CREATE TRIGGER increment_side_bet_revision BEFORE UPDATE ON public.side_bets
  FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();
CREATE TRIGGER increment_trophy_revision BEFORE UPDATE ON public.trophies
  FOR EACH ROW EXECUTE FUNCTION public.increment_live_revision();

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

INSERT INTO public.rounds
  (slug, day_label, play_date, course, tee_window, format, format_detail, points, meal, sort_order)
VALUES
  -- Format labels match Desktop deck: 4th Annual Tin Cup Invitational 2026.pdf
  ('friday', 'Friday', '2026-08-28', 'South Course', '12:19 - 12:44 PM', 'Scramble / Modified Alternate Shot', '4 scramble points + 4 modified alternate shot points', 8, 'Dinner: Salamander Grille', 1),
  ('saturday', 'Saturday', '2026-08-29', 'Copperhead Course', '9:54 - 10:20 AM', 'Modified Stableford Match Play', 'Full team match play; each 9 and total score worth 2 points (2 / 2 / 2)', 6, 'Dinner: 7 PM Steakhouse', 2),
  ('sunday', 'Sunday', '2026-08-30', 'Island Course', '9:54 - 10:20 AM', 'Shamble / Singles', '4 shamble points + 8 singles points', 12, 'Lunch & Awards Ceremony', 3);

-- Day 1 pairings applied in 20260807140000_day1_pairings
INSERT INTO public.matches (round_id, label, points, sort_order)
SELECT r.id, v.label, v.points, v.sort_order
FROM public.rounds r
JOIN (VALUES
  ('friday','Scramble Match 1',1,1),('friday','Scramble Match 2',1,2),
  ('friday','Scramble Match 3',1,3),('friday','Scramble Match 4',1,4),
  ('friday','Alt Shot Match 1',1,5),('friday','Alt Shot Match 2',1,6),
  ('friday','Alt Shot Match 3',1,7),('friday','Alt Shot Match 4',1,8),
  ('saturday','Stableford Front 9',2,1),('saturday','Stableford Back 9',2,2),
  ('saturday','Stableford Overall',2,3),
  ('sunday','Shamble Match 1',1,1),('sunday','Shamble Match 2',1,2),
  ('sunday','Shamble Match 3',1,3),('sunday','Shamble Match 4',1,4),
  ('sunday','Singles Match 1',1,5),('sunday','Singles Match 2',1,6),
  ('sunday','Singles Match 3',1,7),('sunday','Singles Match 4',1,8),
  ('sunday','Singles Match 5',1,9),('sunday','Singles Match 6',1,10),
  ('sunday','Singles Match 7',1,11),('sunday','Singles Match 8',1,12)
) AS v(round_slug, label, points, sort_order) ON v.round_slug = r.slug;

INSERT INTO public.side_bets (kind, label, round_id, hole, amount, sort_order)
SELECT v.kind, v.label, r.id, v.hole, v.amount, v.sort_order
FROM public.rounds r
JOIN (VALUES
  -- Kevin (admin) 2026: $100 CTP / $100 LD; contest holes TBD (null until announced).
  ('ctp','CTP - Friday front','friday',NULL::integer,100,1),
  ('ctp','CTP - Friday back','friday',NULL::integer,100,2),
  ('ctp','CTP - Saturday front','saturday',NULL::integer,100,3),
  ('ctp','CTP - Saturday back','saturday',NULL::integer,100,4),
  ('ctp','CTP - Sunday front','sunday',NULL::integer,100,5),
  ('ctp','CTP - Sunday back','sunday',NULL::integer,100,6),
  ('ld','Long Drive - Friday','friday',NULL::integer,100,7),
  ('ld','Long Drive - Saturday','saturday',NULL::integer,100,8)
) AS v(kind, label, round_slug, hole, amount, sort_order) ON v.round_slug = r.slug;

INSERT INTO public.trophies (slug, name, description, sort_order) VALUES
  ('championship', 'Championship Trophy', 'Awarded to the winning side of the 26-point cup.', 0),
  ('chubbs-mvp', 'Chubbs Peterson MVP', 'Most points earned across the three rounds.', 1),
  ('steve-stinson-vibes', 'Steve Stinson Vibes Award', 'For the man who kept the vibes high all weekend.', 2),
  ('snake-pit', 'Snake Pit Trophy', 'Best play through Copperhead 16, 17 and 18.', 3);
