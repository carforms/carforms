DROP POLICY IF EXISTS "Users update own post media" ON storage.objects;
CREATE POLICY "Users update own post media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'posts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'posts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);