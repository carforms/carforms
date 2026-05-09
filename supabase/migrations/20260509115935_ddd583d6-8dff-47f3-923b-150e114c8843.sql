CREATE OR REPLACE FUNCTION public.protect_profile_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    -- Allow if no auth context (trusted server / service role) or if caller is admin
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.verified := OLD.verified;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;