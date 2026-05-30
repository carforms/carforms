
-- 1) Prevent role escalation on community_members self-inserts
DROP POLICY IF EXISTS "users join communities" ON public.community_members;
CREATE POLICY "users join communities"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member');

-- Allow community admins (creator) to manage member roles/admin-adds via separate policy
CREATE POLICY "admins add community members"
  ON public.community_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_community_admin(community_id));

-- 2) Storage policies for community-covers bucket (admin-only writes)
DROP POLICY IF EXISTS "community-covers admin insert" ON storage.objects;
DROP POLICY IF EXISTS "community-covers admin update" ON storage.objects;
DROP POLICY IF EXISTS "community-covers admin delete" ON storage.objects;

CREATE POLICY "community-covers admin insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-covers'
    AND public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  );

CREATE POLICY "community-covers admin update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-covers'
    AND public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'community-covers'
    AND public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  );

CREATE POLICY "community-covers admin delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-covers'
    AND public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  );

-- Block fall-through catch-all policies for this bucket by adding a restrictive policy
CREATE POLICY "community-covers writes require admin"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    bucket_id <> 'community-covers'
    OR public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  )
  WITH CHECK (
    bucket_id <> 'community-covers'
    OR public.is_community_admin(
      (NULLIF((storage.foldername(name))[1], ''))::uuid
    )
  );

-- 3) Restrict realtime ELSE branch to authenticated users only
DROP POLICY IF EXISTS "Users only subscribe to own notifications topic" ON realtime.messages;
CREATE POLICY "Users only subscribe to own notifications topic"
  ON realtime.messages
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'notifications:%' THEN
        realtime.topic() = ('notifications:' || COALESCE((SELECT auth.uid())::text, ''))
      ELSE
        auth.role() = 'authenticated'
    END
  );
