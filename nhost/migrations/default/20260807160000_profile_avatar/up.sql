-- Player face on profile (Nhost storage path / file id).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_path text;
