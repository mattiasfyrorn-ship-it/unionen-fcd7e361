
-- Fix 1: Rewrite accept_invitation to use auth.uid() instead of user-supplied p_user_id
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_couple_id UUID;
  v_invitation_id UUID;
  v_inviter_id UUID;
  v_accepter_id UUID;
BEGIN
  -- Use auth.uid() instead of trusting p_user_id parameter
  v_accepter_id := auth.uid();
  
  IF v_accepter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find pending invitation by token
  SELECT id, couple_id, inviter_id INTO v_invitation_id, v_couple_id, v_inviter_id
  FROM partner_invitations
  WHERE token = p_token AND status = 'pending'
  LIMIT 1;

  IF v_invitation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- Set couple_id on BOTH the inviter and the accepter
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = v_inviter_id;
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = v_accepter_id;

  -- Mark invitation as accepted
  UPDATE partner_invitations SET status = 'accepted' WHERE id = v_invitation_id;

  RETURN jsonb_build_object('success', true, 'couple_id', v_couple_id);
END;
$$;

-- Fix 2: Restrict partner_invitations SELECT to inviter or invitee (by email)
DROP POLICY IF EXISTS "Read invitations by token or own" ON public.partner_invitations;

CREATE POLICY "Read own invitations"
ON public.partner_invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = inviter_id
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
