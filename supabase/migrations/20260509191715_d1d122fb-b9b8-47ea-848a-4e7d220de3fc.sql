
-- 1) Tighten post-images storage policies to scope writes by user folder
DROP POLICY IF EXISTS "post-images auth upload" ON storage.objects;
DROP POLICY IF EXISTS "post-images owner delete" ON storage.objects;

CREATE POLICY "post-images user folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "post-images user folder delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "post-images user folder update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'post-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) Drop broken community media policies (admin-based ones already cover them correctly)
DROP POLICY IF EXISTS "Community creators delete media" ON storage.objects;
DROP POLICY IF EXISTS "Community creators update media" ON storage.objects;
DROP POLICY IF EXISTS "Community creators upload media" ON storage.objects;

-- 3) Restrict community_messages SELECT to community members (or community admin)
DROP POLICY IF EXISTS "Messages are publicly readable" ON public.community_messages;

CREATE POLICY "Members read community messages"
ON public.community_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = community_messages.community_id
      AND cm.user_id = auth.uid()
  )
  OR public.is_community_admin(community_messages.community_id)
);

-- 4) Validate community_messages.attachment_url to project storage origin via trigger
CREATE OR REPLACE FUNCTION public.validate_community_message_attachment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.attachment_url IS NOT NULL THEN
    IF NEW.attachment_url NOT LIKE 'https://pcdxxffhqadeniilrvic.supabase.co/storage/%' THEN
      NEW.attachment_url := NULL;
      NEW.attachment_type := NULL;
      NEW.attachment_name := NULL;
      NEW.attachment_size := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_community_message_attachment_trg ON public.community_messages;
CREATE TRIGGER validate_community_message_attachment_trg
BEFORE INSERT OR UPDATE ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_community_message_attachment();

-- 5) Lock down trigger function from being executable by web roles
REVOKE EXECUTE ON FUNCTION public.protect_profile_verified() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_community_message_attachment() FROM PUBLIC, anon, authenticated;
