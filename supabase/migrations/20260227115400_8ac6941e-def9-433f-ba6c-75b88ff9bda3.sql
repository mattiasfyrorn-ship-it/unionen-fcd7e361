
-- Add inviter_name column to partner_invitations
ALTER TABLE public.partner_invitations ADD COLUMN inviter_name text DEFAULT '';

-- Create RPC to fetch inviter name from token (no auth required)
CREATE OR REPLACE FUNCTION public.get_invitation_info(p_token text)
RETURNS TABLE(inviter_name text) AS $$
  SELECT pi.inviter_name FROM public.partner_invitations pi
  WHERE pi.token = p_token AND pi.status = 'pending' LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = 'public';
