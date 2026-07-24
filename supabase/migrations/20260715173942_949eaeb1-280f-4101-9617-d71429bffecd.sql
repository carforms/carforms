
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text NOT NULL UNIQUE,
  role text[] NOT NULL CHECK (array_length(role, 1) >= 1),
  account_type text NOT NULL CHECK (account_type IN ('private','business')),
  company_name text,
  privacy_consent boolean NOT NULL CHECK (privacy_consent = true),
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
