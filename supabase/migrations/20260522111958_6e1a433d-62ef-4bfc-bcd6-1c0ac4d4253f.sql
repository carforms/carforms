
-- Forum questions
CREATE TABLE public.forum_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  image_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  solved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_questions_created_at ON public.forum_questions(created_at DESC);
CREATE INDEX idx_forum_questions_author ON public.forum_questions(author_id);

ALTER TABLE public.forum_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_questions readable by all" ON public.forum_questions FOR SELECT USING (true);
CREATE POLICY "auth users create forum questions" ON public.forum_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "authors update own forum questions" ON public.forum_questions FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "authors delete own forum questions" ON public.forum_questions FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER forum_questions_updated_at BEFORE UPDATE ON public.forum_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Forum answers
CREATE TABLE public.forum_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  image_url TEXT,
  is_best BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_answers_question ON public.forum_answers(question_id, created_at);

ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_answers readable by all" ON public.forum_answers FOR SELECT USING (true);
CREATE POLICY "auth users create forum answers" ON public.forum_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "authors or question owner update answers" ON public.forum_answers FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = (SELECT author_id FROM public.forum_questions q WHERE q.id = question_id))
  WITH CHECK (auth.uid() = author_id OR auth.uid() = (SELECT author_id FROM public.forum_questions q WHERE q.id = question_id));
CREATE POLICY "authors delete own forum answers" ON public.forum_answers FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER forum_answers_updated_at BEFORE UPDATE ON public.forum_answers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Likes
CREATE TABLE public.forum_question_likes (
  question_id UUID NOT NULL REFERENCES public.forum_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, user_id)
);
ALTER TABLE public.forum_question_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_question_likes readable by all" ON public.forum_question_likes FOR SELECT USING (true);
CREATE POLICY "auth users like forum questions" ON public.forum_question_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike own forum question likes" ON public.forum_question_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.forum_answer_likes (
  answer_id UUID NOT NULL REFERENCES public.forum_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, user_id)
);
ALTER TABLE public.forum_answer_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_answer_likes readable by all" ON public.forum_answer_likes FOR SELECT USING (true);
CREATE POLICY "auth users like forum answers" ON public.forum_answer_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike own forum answer likes" ON public.forum_answer_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
