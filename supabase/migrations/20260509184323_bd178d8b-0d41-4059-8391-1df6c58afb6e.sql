-- Helper: is the current user the creator of the given community?
CREATE OR REPLACE FUNCTION public.is_community_admin(_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = _community_id AND created_by = auth.uid()
  );
$$;

-- Allow admin to kick any member of their community
DROP POLICY IF EXISTS "admin kicks members" ON public.community_members;
CREATE POLICY "admin kicks members"
ON public.community_members
FOR DELETE
TO authenticated
USING (public.is_community_admin(community_id));

-- Allow admin to delete any message in their community
DROP POLICY IF EXISTS "admin deletes any message" ON public.community_messages;
CREATE POLICY "admin deletes any message"
ON public.community_messages
FOR DELETE
TO authenticated
USING (public.is_community_admin(community_id));

-- Storage policies for communities bucket so admins can upload covers
DROP POLICY IF EXISTS "communities cover public read" ON storage.objects;
CREATE POLICY "communities cover public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'communities');

DROP POLICY IF EXISTS "community admin uploads cover" ON storage.objects;
CREATE POLICY "community admin uploads cover"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'communities'
  AND public.is_community_admin(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "community admin updates cover" ON storage.objects;
CREATE POLICY "community admin updates cover"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'communities'
  AND public.is_community_admin(((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "community admin deletes cover" ON storage.objects;
CREATE POLICY "community admin deletes cover"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'communities'
  AND public.is_community_admin(((storage.foldername(name))[1])::uuid)
);