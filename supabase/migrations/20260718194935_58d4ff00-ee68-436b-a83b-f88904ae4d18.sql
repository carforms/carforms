
-- 1) Deduplicate existing rows: keep the oldest per image_url / body.
WITH dup_images AS (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY image_url ORDER BY created_at ASC, id ASC) rn
    FROM posts WHERE image_url IS NOT NULL
  ) t WHERE rn > 1
),
dup_bodies AS (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY body ORDER BY created_at ASC, id ASC) rn
    FROM posts WHERE body IS NOT NULL AND length(trim(body)) > 0
  ) t WHERE rn > 1
),
to_delete AS (SELECT id FROM dup_images UNION SELECT id FROM dup_bodies)
DELETE FROM posts WHERE id IN (SELECT id FROM to_delete);

-- 2) Enforce uniqueness going forward (partial: NULL/empty allowed).
CREATE UNIQUE INDEX IF NOT EXISTS posts_unique_image_url
  ON public.posts (image_url) WHERE image_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_unique_body
  ON public.posts (body) WHERE body IS NOT NULL AND length(trim(body)) > 0;
