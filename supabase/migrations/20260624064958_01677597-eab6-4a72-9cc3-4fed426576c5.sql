
DROP POLICY IF EXISTS "authors update own forum questions" ON public.forum_questions;
CREATE POLICY "authors update own forum questions"
  ON public.forum_questions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (
    auth.uid() = author_id
    AND (
      community_id IS NULL
      OR is_community_member(community_id)
      OR is_community_admin(community_id)
    )
  );
