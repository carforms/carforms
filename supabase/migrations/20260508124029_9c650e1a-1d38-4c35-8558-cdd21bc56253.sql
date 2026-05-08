-- 1. Fix community storage ownership policies
DROP POLICY IF EXISTS "Community creators upload media" ON storage.objects;
DROP POLICY IF EXISTS "Community creators update media" ON storage.objects;
DROP POLICY IF EXISTS "Community creators delete media" ON storage.objects;

CREATE POLICY "Community creators upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Community creators update media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Community creators delete media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);

-- 2. Drop broad SELECT policies on public buckets to prevent listing.
-- Public URLs from getPublicUrl() continue to work (they bypass RLS).
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read posts media" ON storage.objects;
DROP POLICY IF EXISTS "Public read communities media" ON storage.objects;
DROP POLICY IF EXISTS "Public read carforms logo" ON storage.objects;

-- 3. Block client-side inserts into notifications (trigger uses SECURITY DEFINER and bypasses RLS).
DROP POLICY IF EXISTS "no client inserts on notifications" ON public.notifications;
CREATE POLICY "no client inserts on notifications"
ON public.notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 4. Restrict realtime notification channel subscriptions to the channel owner.
DROP POLICY IF EXISTS "Users only subscribe to own notifications topic" ON realtime.messages;
CREATE POLICY "Users only subscribe to own notifications topic"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated, anon
USING (
  CASE
    WHEN realtime.topic() LIKE 'notifications:%'
      THEN realtime.topic() = 'notifications:' || COALESCE((SELECT auth.uid())::text, '')
    ELSE true
  END
);