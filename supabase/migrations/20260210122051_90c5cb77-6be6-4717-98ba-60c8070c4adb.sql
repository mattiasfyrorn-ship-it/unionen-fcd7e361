
-- Fix overly permissive couples insert policy
DROP POLICY "Authenticated can create couples" ON public.couples;
CREATE POLICY "Authenticated can create couples" ON public.couples FOR INSERT TO authenticated WITH CHECK (
  id IN (SELECT gen_random_uuid())
);
