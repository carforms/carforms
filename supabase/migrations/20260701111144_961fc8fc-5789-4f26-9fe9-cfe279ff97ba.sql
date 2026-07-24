
-- Restrict SELECT on forum_questions to public questions or community members
DROP POLICY IF EXISTS "forum_questions readable by all" ON public.forum_questions;
CREATE POLICY "forum_questions visible if public or member"
ON public.forum_questions FOR SELECT
USING (
  community_id IS NULL
  OR public.is_community_member(community_id)
  OR public.is_community_admin(community_id)
);

-- Restrict SELECT on forum_answers via parent question community
DROP POLICY IF EXISTS "forum_answers readable by all" ON public.forum_answers;
CREATE POLICY "forum_answers visible if question is visible"
ON public.forum_answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_questions q
    WHERE q.id = forum_answers.question_id
      AND (
        q.community_id IS NULL
        OR public.is_community_member(q.community_id)
        OR public.is_community_admin(q.community_id)
      )
  )
);

-- Restrict SELECT on forum_question_likes via parent question community
DROP POLICY IF EXISTS "forum_question_likes readable by all" ON public.forum_question_likes;
CREATE POLICY "forum_question_likes visible if question is visible"
ON public.forum_question_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_questions q
    WHERE q.id = forum_question_likes.question_id
      AND (
        q.community_id IS NULL
        OR public.is_community_member(q.community_id)
        OR public.is_community_admin(q.community_id)
      )
  )
);

-- Restrict SELECT on forum_answer_likes via parent question community
DROP POLICY IF EXISTS "forum_answer_likes readable by all" ON public.forum_answer_likes;
CREATE POLICY "forum_answer_likes visible if question is visible"
ON public.forum_answer_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.forum_answers a
    JOIN public.forum_questions q ON q.id = a.question_id
    WHERE a.id = forum_answer_likes.answer_id
      AND (
        q.community_id IS NULL
        OR public.is_community_member(q.community_id)
        OR public.is_community_admin(q.community_id)
      )
  )
);
