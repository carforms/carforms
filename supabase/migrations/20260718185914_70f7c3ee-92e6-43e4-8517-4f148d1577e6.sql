
DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE image_url LIKE '%/seed/car_%' OR image_url LIKE '%images.unsplash.com%' OR image_url LIKE '%dicebear%');
DELETE FROM post_likes    WHERE post_id IN (SELECT id FROM posts WHERE image_url LIKE '%/seed/car_%' OR image_url LIKE '%images.unsplash.com%' OR image_url LIKE '%dicebear%');
DELETE FROM posts WHERE image_url LIKE '%/seed/car_%' OR image_url LIKE '%images.unsplash.com%' OR image_url LIKE '%dicebear%';

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY image_url ORDER BY created_at DESC) rn
  FROM posts WHERE image_url IS NOT NULL
), dupes AS (SELECT id FROM ranked WHERE rn > 1)
DELETE FROM post_comments WHERE post_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY image_url ORDER BY created_at DESC) rn
  FROM posts WHERE image_url IS NOT NULL
), dupes AS (SELECT id FROM ranked WHERE rn > 1)
DELETE FROM post_likes WHERE post_id IN (SELECT id FROM dupes);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY image_url ORDER BY created_at DESC) rn
  FROM posts WHERE image_url IS NOT NULL
)
DELETE FROM posts WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE profiles SET avatar_url = NULL WHERE avatar_url LIKE '%dicebear%' OR avatar_url LIKE '%unsplash%';
