INSERT INTO storage.buckets (id, name, public)
VALUES ('community-covers', 'community-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Community covers are publicly readable" ON storage.objects;
CREATE POLICY "Community covers are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-covers');

DROP POLICY IF EXISTS "Authenticated users can upload community covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload community covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-covers');

DROP POLICY IF EXISTS "Authenticated users can update community covers" ON storage.objects;
CREATE POLICY "Authenticated users can update community covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'community-covers');