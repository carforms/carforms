-- Add verified flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Prevent users from setting verified on themselves; only admins can change it
CREATE OR REPLACE FUNCTION public.protect_profile_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.verified := OLD.verified;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_verified ON public.profiles;
CREATE TRIGGER profiles_protect_verified
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_verified();