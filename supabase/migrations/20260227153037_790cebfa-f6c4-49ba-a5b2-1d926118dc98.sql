
-- 1. Make couple_id nullable in daily_checks, evaluations, weekly_conversations
ALTER TABLE daily_checks ALTER COLUMN couple_id DROP NOT NULL;
ALTER TABLE evaluations ALTER COLUMN couple_id DROP NOT NULL;
ALTER TABLE weekly_conversations ALTER COLUMN couple_id DROP NOT NULL;

-- 2. Add SELECT policy for own data on daily_checks
CREATE POLICY "Users can read own daily checks"
ON daily_checks FOR SELECT
USING (auth.uid() = user_id);

-- 3. Add SELECT policy for own data on evaluations (already exists, skip)
-- "Users can read own evaluations" already exists

-- 4. Drop the old ALL policy on weekly_conversations and replace with granular ones
DROP POLICY IF EXISTS "Couple members can manage conversations" ON weekly_conversations;

-- Add a user_id column to weekly_conversations for solo support
ALTER TABLE weekly_conversations ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE POLICY "Users can read own or couple conversations"
ON weekly_conversations FOR SELECT
USING (
  auth.uid() = user_id
  OR couple_id = get_my_couple_id()
  OR EXISTS (
    SELECT 1 FROM weekly_entries we WHERE we.conversation_id = id AND we.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own conversations"
ON weekly_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or couple conversations"
ON weekly_conversations FOR UPDATE
USING (
  auth.uid() = user_id
  OR couple_id = get_my_couple_id()
);

CREATE POLICY "Users can delete own conversations"
ON weekly_conversations FOR DELETE
USING (auth.uid() = user_id);
