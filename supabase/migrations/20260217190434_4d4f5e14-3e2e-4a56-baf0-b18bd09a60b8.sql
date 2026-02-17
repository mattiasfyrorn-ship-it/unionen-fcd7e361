
-- Block direct couple inserts from the client entirely.
-- All couple creation now goes through the pair_with_partner() SECURITY DEFINER function.
DROP POLICY IF EXISTS "Authenticated can create couples" ON public.couples;
CREATE POLICY "No direct couple creation"
ON public.couples FOR INSERT
WITH CHECK (false);
