CREATE POLICY "vault read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'vault');
CREATE POLICY "vault upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vault' AND owner = auth.uid());
CREATE POLICY "vault delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'vault' AND (owner = auth.uid() OR public.is_scorekeeper(auth.uid())));