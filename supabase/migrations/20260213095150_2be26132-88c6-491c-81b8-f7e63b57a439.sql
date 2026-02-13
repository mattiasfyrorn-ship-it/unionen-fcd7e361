
-- Fix the couples INSERT policy: drop RESTRICTIVE and create PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can create couples" ON public.couples;

CREATE POLICY "Authenticated can create couples"
ON public.couples
FOR INSERT
TO authenticated
WITH CHECK (true);
