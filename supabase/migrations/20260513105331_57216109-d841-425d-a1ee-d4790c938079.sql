CREATE TYPE public.post_category AS ENUM ('jdm', 'stance', 'drift', 'track');

ALTER TABLE public.posts
  ADD COLUMN category public.post_category;

CREATE INDEX idx_posts_category_created_at
  ON public.posts (category, created_at DESC)
  WHERE category IS NOT NULL;