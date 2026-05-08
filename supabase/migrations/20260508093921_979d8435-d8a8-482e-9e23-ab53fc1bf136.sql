-- Remove broad SELECT policies on storage.objects.
-- Public buckets still serve files via direct public URLs (CDN), but this prevents
-- clients from listing/enumerating all files in the bucket through the API.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read communities media" ON storage.objects;
DROP POLICY IF EXISTS "Public read posts media" ON storage.objects;

-- Tighten community bucket: scope writes to the community creator,
-- with the first folder segment of the object name = community id.
DROP POLICY IF EXISTS "Users upload community media" ON storage.objects;

CREATE POLICY "Community creators upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Community creators update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Community creators delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'communities'
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.created_by = auth.uid()
  )
);
