INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Community images are publicly readable') THEN
    CREATE POLICY "Community images are publicly readable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'community-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated users can upload community images') THEN
    CREATE POLICY "Authenticated users can upload community images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'community-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update own community images') THEN
    CREATE POLICY "Users can update own community images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'community-images');
  END IF;
END $$;