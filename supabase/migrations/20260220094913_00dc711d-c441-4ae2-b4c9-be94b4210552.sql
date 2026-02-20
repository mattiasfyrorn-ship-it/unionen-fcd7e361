
-- Lägg till check_date med week_start som default för befintlig data
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS check_date date;
UPDATE evaluations SET check_date = week_start WHERE check_date IS NULL;
ALTER TABLE evaluations ALTER COLUMN check_date SET NOT NULL;

-- Ta bort gammalt unikt index/constraint om det finns
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'evaluations_user_id_week_start_area_key'
  ) THEN
    ALTER TABLE evaluations DROP CONSTRAINT evaluations_user_id_week_start_area_key;
  END IF;
END $$;

-- Skapa nytt unikt index per dag (om det inte redan finns)
CREATE UNIQUE INDEX IF NOT EXISTS evaluations_user_id_check_date_area_key 
  ON evaluations (user_id, check_date, area);
