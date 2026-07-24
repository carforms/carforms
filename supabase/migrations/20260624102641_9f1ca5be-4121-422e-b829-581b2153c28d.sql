
-- Fix 1: Require community membership on chat-attachments uploads.
-- Path convention: <auth.uid()>/<community_id>/<filename>
DROP POLICY IF EXISTS "Authenticated users upload chat attachments" ON storage.objects;

CREATE POLICY "Community members upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND (
    public.is_community_member(((storage.foldername(name))[2])::uuid)
    OR public.is_community_admin(((storage.foldername(name))[2])::uuid)
  )
);

-- Fix 2: Make denial of community_messages edits explicit instead of implicit-via-absence.
CREATE POLICY "Community messages are immutable"
ON public.community_messages
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);
