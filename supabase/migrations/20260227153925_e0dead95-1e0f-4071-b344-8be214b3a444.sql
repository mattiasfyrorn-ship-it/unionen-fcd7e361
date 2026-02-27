CREATE POLICY "Users can read own entries"
ON weekly_entries FOR SELECT
USING (auth.uid() = user_id);