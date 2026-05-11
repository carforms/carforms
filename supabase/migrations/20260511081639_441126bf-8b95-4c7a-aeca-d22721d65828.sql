
CREATE POLICY "admin deletes any community"
ON public.communities
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin deletes community members"
ON public.community_members
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
