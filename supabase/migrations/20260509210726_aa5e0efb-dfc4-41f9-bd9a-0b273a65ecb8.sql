
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Community covers are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update community covers" ON storage.objects;
DROP POLICY IF EXISTS "Post images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Community images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update community images" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can read storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload anything" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update anything" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete anything" ON storage.objects;

-- Public read across all buckets
CREATE POLICY "Public read all storage"
ON storage.objects FOR SELECT
USING (true);

-- Authenticated users can upload only into their own user-id folder
CREATE POLICY "Authenticated users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can update only their own files
CREATE POLICY "Authenticated users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can delete only their own files
CREATE POLICY "Authenticated users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Make all buckets public for read access
UPDATE storage.buckets SET public = true;
