-- 1. Private (non-API-exposed) schema for internal permission helpers
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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

CREATE OR REPLACE FUNCTION private.is_scorekeeper(_user_id uuid)
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

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_scorekeeper(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_scorekeeper(uuid) TO authenticated, service_role;

-- 2. Repoint every policy at the private helpers
DROP POLICY "own roles readable" ON public.user_roles;
CREATE POLICY "own roles readable" ON public.user_roles
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY "scorekeepers update matches" ON public.matches;
CREATE POLICY "scorekeepers update matches" ON public.matches
FOR UPDATE TO authenticated
USING (private.is_scorekeeper(auth.uid()))
WITH CHECK (private.is_scorekeeper(auth.uid()));

DROP POLICY "scorekeepers update side bets" ON public.side_bets;
CREATE POLICY "scorekeepers update side bets" ON public.side_bets
FOR UPDATE TO authenticated
USING (private.is_scorekeeper(auth.uid()))
WITH CHECK (private.is_scorekeeper(auth.uid()));

DROP POLICY "owners or scorekeepers delete photos" ON public.photos;
CREATE POLICY "owners or scorekeepers delete photos" ON public.photos
FOR DELETE TO authenticated
USING ((uploaded_by = auth.uid()) OR private.is_scorekeeper(auth.uid()));

DROP POLICY "vault delete" ON storage.objects;
CREATE POLICY "vault delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'vault'
  AND ((owner = auth.uid()) OR private.is_scorekeeper(auth.uid()))
);

-- 3. Drop the API-exposed SECURITY DEFINER helpers
DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.is_scorekeeper(uuid);

-- 4. Vault reads: uploader, scorekeepers, or files published to the shared gallery
DROP POLICY "vault read" ON storage.objects;
CREATE POLICY "vault read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vault'
  AND (
    owner = auth.uid()
    OR private.is_scorekeeper(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.photos p WHERE p.storage_path = storage.objects.name
    )
  )
);