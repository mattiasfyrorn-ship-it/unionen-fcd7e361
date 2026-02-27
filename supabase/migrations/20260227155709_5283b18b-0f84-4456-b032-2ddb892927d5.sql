DROP POLICY IF EXISTS "Users can read own or couple conversations" ON weekly_conversations;

CREATE POLICY "Users can read own or couple conversations"
  ON weekly_conversations FOR SELECT
  USING (
    auth.uid() = user_id 
    OR couple_id = get_my_couple_id()
  );