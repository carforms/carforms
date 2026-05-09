
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "post-images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "post-images auth upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "post-images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-images' AND owner = auth.uid());
