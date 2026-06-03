-- Fix 1: Restrict admin INSERT on community_members to role='member' only
DROP POLICY IF EXISTS "admins add community members" ON public.community_members;
CREATE POLICY "admins add community members"
ON public.community_members
FOR INSERT
TO authenticated
WITH CHECK (is_community_admin(community_id) AND role = 'member');

-- Fix 2: Tighten Realtime topic policies so the ELSE branch denies instead of allowing all authenticated users on arbitrary topics
DROP POLICY IF EXISTS "Community chat members only" ON realtime.messages;
CREATE POLICY "Community chat members only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'community-chat-%' THEN (
      is_community_member((NULLIF(substring(realtime.topic(), 'community-chat-(.*)'), ''))::uuid)
      OR is_community_admin((NULLIF(substring(realtime.topic(), 'community-chat-(.*)'), ''))::uuid)
    )
    ELSE false
  END
);

DROP POLICY IF EXISTS "Users only subscribe to own notifications topic" ON realtime.messages;
CREATE POLICY "Users only subscribe to own notifications topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'notifications:%'
  AND realtime.topic() = ('notifications:' || COALESCE((SELECT auth.uid())::text, ''))
);