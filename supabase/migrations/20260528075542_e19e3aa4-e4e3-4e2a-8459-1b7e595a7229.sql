
-- Helper: community membership check
CREATE OR REPLACE FUNCTION public.is_community_member(_community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = _community_id AND user_id = auth.uid()
  );
$$;

-- 1) Storage: community-images bucket — enforce per-user folder ownership
DROP POLICY IF EXISTS "Users can update own community images" ON storage.objects;

CREATE POLICY "Users can upload own community images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own community images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'community-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'community-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own community images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) community_messages: require membership on INSERT
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.community_messages;

CREATE POLICY "Members can send community messages"
ON public.community_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.is_community_member(community_id)
    OR public.is_community_admin(community_id)
  )
);

-- 3) forum_questions: require membership when posting into a community
DROP POLICY IF EXISTS "auth users create forum questions" ON public.forum_questions;

CREATE POLICY "auth users create forum questions"
ON public.forum_questions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (
    community_id IS NULL
    OR public.is_community_member(community_id)
    OR public.is_community_admin(community_id)
  )
);

-- 4) Realtime: restrict community chat topic subscriptions to members
-- Topic format from client: 'community-chat-' || community.id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'realtime' AND c.relname = 'messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Community chat members only" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Community chat members only"
      ON realtime.messages
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        CASE
          WHEN realtime.topic() LIKE 'community-chat-%' THEN
            public.is_community_member(
              NULLIF(substring(realtime.topic() from 'community-chat-(.*)'), '')::uuid
            )
            OR public.is_community_admin(
              NULLIF(substring(realtime.topic() from 'community-chat-(.*)'), '')::uuid
            )
          ELSE true
        END
      )
    $p$;
  END IF;
END $$;
