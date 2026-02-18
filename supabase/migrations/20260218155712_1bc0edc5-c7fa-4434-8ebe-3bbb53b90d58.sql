
-- =============================================
-- STEG 1: Backfill befintliga profiler utan couple_id
-- =============================================
DO $$
DECLARE
  r RECORD;
  v_couple_id uuid;
BEGIN
  FOR r IN SELECT user_id FROM profiles WHERE couple_id IS NULL LOOP
    INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;
    UPDATE profiles SET couple_id = v_couple_id WHERE user_id = r.user_id;
  END LOOP;
END;
$$;

-- =============================================
-- STEG 2: Funktion: skapa solo-couple BEFORE INSERT på profiles
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_profile_couple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_id uuid;
BEGIN
  -- Skapa ett solo-couple om couple_id inte redan är satt
  -- (handle_invitation_on_signup körs AFTER INSERT och kan skriva över detta)
  IF NEW.couple_id IS NULL THEN
    INSERT INTO couples DEFAULT VALUES RETURNING id INTO v_couple_id;
    NEW.couple_id := v_couple_id;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- STEG 3: Trigger BEFORE INSERT på profiles
-- =============================================
DROP TRIGGER IF EXISTS on_profile_created_create_couple ON public.profiles;
CREATE TRIGGER on_profile_created_create_couple
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_couple();
