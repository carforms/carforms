
CREATE OR REPLACE FUNCTION public.validate_image_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    IF NEW.image_url NOT LIKE 'https://pcdxxffhqadeniilrvic.supabase.co/storage/%'
       AND NEW.image_url NOT LIKE 'https://res.cloudinary.com/%' THEN
      NEW.image_url := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_posts_image_url ON public.posts;
CREATE TRIGGER validate_posts_image_url
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_url();

DROP TRIGGER IF EXISTS validate_forum_questions_image_url ON public.forum_questions;
CREATE TRIGGER validate_forum_questions_image_url
  BEFORE INSERT OR UPDATE ON public.forum_questions
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_url();

DROP TRIGGER IF EXISTS validate_forum_answers_image_url ON public.forum_answers;
CREATE TRIGGER validate_forum_answers_image_url
  BEFORE INSERT OR UPDATE ON public.forum_answers
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_url();

DROP TRIGGER IF EXISTS validate_post_comments_image_url ON public.post_comments;
CREATE TRIGGER validate_post_comments_image_url
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_url();

DROP POLICY IF EXISTS "no role updates via api" ON public.community_members;
CREATE POLICY "no role updates via api"
  ON public.community_members
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments owner read" ON storage.objects;
CREATE POLICY "Chat attachments owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Public read all storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users update own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users delete own files" ON storage.objects;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "posts public read" ON storage.objects;
CREATE POLICY "posts public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "email-assets public read" ON storage.objects;
CREATE POLICY "email-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets');

DROP POLICY IF EXISTS "community-images public read" ON storage.objects;
CREATE POLICY "community-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "community-covers public read" ON storage.objects;
CREATE POLICY "community-covers public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-covers');
