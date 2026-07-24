DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_signups;

CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  privacy_consent = true
  AND email IS NOT NULL
  AND length(trim(email)) BETWEEN 5 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND full_name IS NOT NULL
  AND length(trim(full_name)) BETWEEN 1 AND 200
);