
-- Allow community members to read chat-attachments stored under a community-scoped path.
-- Convention: object path begins with the community_id UUID as the first folder segment.
DROP POLICY IF EXISTS "Community members read chat attachments" ON storage.objects;

CREATE POLICY "Community members read chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.is_community_member(((storage.foldername(name))[1])::uuid)
);
