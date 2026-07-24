DROP POLICY IF EXISTS "members readable by all" ON public.community_members;
CREATE POLICY "members readable by authenticated" ON public.community_members
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.community_members FROM anon;