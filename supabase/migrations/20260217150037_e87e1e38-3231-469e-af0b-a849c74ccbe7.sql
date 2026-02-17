
-- Fix 1: Replace overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Users can read by pairing code" ON public.profiles;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to read their partner's profile (same couple)
CREATE POLICY "Users can read partner profile" ON public.profiles 
  FOR SELECT USING (
    couple_id IS NOT NULL AND 
    couple_id IN (
      SELECT p.couple_id FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.couple_id IS NOT NULL
    )
  );

-- Create RPC function for pairing code lookup (limited fields only)
CREATE OR REPLACE FUNCTION public.find_partner_by_code(p_code TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, couple_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.couple_id
  FROM profiles p
  WHERE p.pairing_code = p_code
  LIMIT 1;
END;
$$;

-- Fix 3: Allow partners to read couple repairs
CREATE POLICY "Partners can read couple repairs" ON public.repairs 
  FOR SELECT USING (
    couple_id IN (
      SELECT p.couple_id FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.couple_id IS NOT NULL
    )
  );
