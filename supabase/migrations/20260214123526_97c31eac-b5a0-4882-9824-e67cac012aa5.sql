
ALTER TABLE daily_checks ADD COLUMN climate integer;
ALTER TABLE evaluations ADD COLUMN need_today text;
ALTER TABLE evaluations ADD COLUMN want_today text;
ALTER TABLE weekly_entries ADD COLUMN partner_learning text;
ALTER TABLE profiles ADD COLUMN share_development boolean DEFAULT false;

CREATE TABLE quarterly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  quarter_start date NOT NULL,
  relationship_goal text,
  experience_goal text,
  practical_goal text,
  relationship_done boolean DEFAULT false,
  experience_done boolean DEFAULT false,
  practical_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quarterly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own goals" ON quarterly_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Read own goals" ON quarterly_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own goals" ON quarterly_goals
  FOR UPDATE USING (auth.uid() = user_id);
