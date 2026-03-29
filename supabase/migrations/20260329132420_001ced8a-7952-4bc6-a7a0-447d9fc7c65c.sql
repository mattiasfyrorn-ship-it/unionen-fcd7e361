
CREATE TABLE couple_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  quarter_start date NOT NULL,
  goal_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, quarter_start, goal_type)
);

ALTER TABLE couple_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read couple goals" ON couple_goals FOR SELECT
  USING (couple_id = get_my_couple_id());
CREATE POLICY "Insert couple goals" ON couple_goals FOR INSERT
  WITH CHECK (couple_id = get_my_couple_id());
CREATE POLICY "Update couple goals" ON couple_goals FOR UPDATE
  USING (couple_id = get_my_couple_id());
CREATE POLICY "Delete couple goals" ON couple_goals FOR DELETE
  USING (couple_id = get_my_couple_id());

CREATE TRIGGER set_couple_goals_updated_at
  BEFORE UPDATE ON couple_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
