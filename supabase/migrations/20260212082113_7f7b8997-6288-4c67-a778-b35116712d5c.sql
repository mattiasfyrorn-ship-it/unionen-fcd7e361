
-- Fix couples INSERT policy - current one uses impossible check
DROP POLICY IF EXISTS "Authenticated can create couples" ON public.couples;
CREATE POLICY "Authenticated can create couples"
ON public.couples
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to look up profiles by pairing_code for pairing
DROP POLICY IF EXISTS "Users can read by pairing code" ON public.profiles;
CREATE POLICY "Users can read by pairing code"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old narrow read policy since the new one covers it
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read partner profile" ON public.profiles;
