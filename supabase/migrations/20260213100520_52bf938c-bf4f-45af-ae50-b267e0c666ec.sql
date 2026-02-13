
-- Update accept_invitation to create couple and link BOTH users at acceptance time
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_couple_id UUID;
  v_invitation_id UUID;
  v_inviter_id UUID;
BEGIN
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
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = p_user_id;

  -- Mark invitation as accepted
  UPDATE partner_invitations SET status = 'accepted' WHERE id = v_invitation_id;

  RETURN jsonb_build_object('success', true, 'couple_id', v_couple_id);
END;
$function$;

-- Update handle_invitation_on_signup to also link the inviter
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_couple_id UUID;
  v_invitation_id UUID;
  v_inviter_id UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, couple_id, inviter_id INTO v_invitation_id, v_couple_id, v_inviter_id
  FROM partner_invitations
  WHERE invitee_email = v_email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation_id IS NOT NULL THEN
    -- Auto-pair: set couple_id on BOTH the new profile and the inviter
    NEW.couple_id := v_couple_id;
    UPDATE profiles SET couple_id = v_couple_id WHERE user_id = v_inviter_id;
    UPDATE partner_invitations SET status = 'accepted' WHERE id = v_invitation_id;
  END IF;

  RETURN NEW;
END;
$function$;
