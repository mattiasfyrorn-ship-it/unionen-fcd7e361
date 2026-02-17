
-- Drop old find_partner_by_code (return type change requires drop first)
DROP FUNCTION IF EXISTS public.find_partner_by_code(text);

-- Recreate find_partner_by_code returning only display_name (not user_id or couple_id)
CREATE FUNCTION public.find_partner_by_code(p_code text)
RETURNS TABLE(display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.display_name
  FROM profiles p
  WHERE p.pairing_code = p_code
    AND p.user_id <> auth.uid()
  LIMIT 1;
END;
$$;

-- New secure server-side pairing function
-- Handles couple creation + both-profile update atomically, client never sees partner IDs
CREATE OR REPLACE FUNCTION public.pair_with_partner(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
  v_partner_couple_id uuid;
  v_my_couple_id uuid;
  v_couple_id uuid;
  v_partner_display_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT p.user_id, p.couple_id, p.display_name
  INTO v_partner_id, v_partner_couple_id, v_partner_display_name
  FROM profiles p
  WHERE p.pairing_code = p_code
    AND p.user_id <> auth.uid()
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner not found');
  END IF;

  SELECT couple_id INTO v_my_couple_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_partner_couple_id IS NOT NULL THEN
    v_couple_id := v_partner_couple_id;
  ELSIF v_my_couple_id IS NOT NULL THEN
    v_couple_id := v_my_couple_id;
  ELSE
    INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;
  END IF;

  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = v_partner_id;
  UPDATE profiles SET couple_id = v_couple_id WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'partnerName', v_partner_display_name);
END;
$$;
