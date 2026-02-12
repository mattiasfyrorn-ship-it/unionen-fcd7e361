
-- Step 1: Drop existing restrictive RLS policies on couples and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can create couples" ON public.couples;
CREATE POLICY "Authenticated can create couples"
  ON public.couples FOR INSERT TO authenticated
  WITH CHECK (true);

-- Step 2: Add token column to partner_invitations
ALTER TABLE public.partner_invitations
  ADD COLUMN IF NOT EXISTS token TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 16);

-- Step 3: Allow reading invitations by token (for accepting invitations)
DROP POLICY IF EXISTS "Read own invitations" ON public.partner_invitations;
CREATE POLICY "Read invitations by token or own"
  ON public.partner_invitations FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR token IS NOT NULL);

-- Step 4: Create accept_invitation function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Find pending invitation by token
  SELECT id, couple_id INTO v_invitation_id, v_couple_id
  FROM partner_invitations
  WHERE token = p_token AND status = 'pending'
  LIMIT 1;

  IF v_invitation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- Update user's profile with couple_id
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = p_user_id;

  -- Mark invitation as accepted
  UPDATE partner_invitations SET status = 'accepted' WHERE id = v_invitation_id;

  RETURN jsonb_build_object('success', true, 'couple_id', v_couple_id);
END;
$$;

-- Step 5: Create auto-pair trigger on profile creation
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_couple_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check for pending invitation matching this email
  SELECT id, couple_id INTO v_invitation_id, v_couple_id
  FROM partner_invitations
  WHERE invitee_email = v_email AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation_id IS NOT NULL THEN
    -- Auto-pair: set couple_id on the new profile
    NEW.couple_id := v_couple_id;
    -- Mark invitation as accepted
    UPDATE partner_invitations SET status = 'accepted' WHERE id = v_invitation_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_signup_check_invitation ON public.profiles;
CREATE TRIGGER on_signup_check_invitation
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_on_signup();
