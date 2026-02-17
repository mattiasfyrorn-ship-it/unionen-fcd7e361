
-- Fix 1: Change get_my_couple_id() from STABLE to VOLATILE to prevent stale cache
CREATE OR REPLACE FUNCTION public.get_my_couple_id()
  RETURNS uuid
  LANGUAGE sql
  VOLATILE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT couple_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Fix 2: Add couple-level read policy for quarterly_goals
CREATE POLICY "Read couple goals"
ON public.quarterly_goals
FOR SELECT
USING (
  couple_id = public.get_my_couple_id() OR auth.uid() = user_id
);

-- Fix 3: Add DELETE policies for user-owned tables

-- messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (auth.uid() = sender_id);

-- repairs
CREATE POLICY "Users can delete own repairs"
ON public.repairs
FOR DELETE
USING (auth.uid() = user_id);

-- repair_responses
CREATE POLICY "Users can delete own responses"
ON public.repair_responses
FOR DELETE
USING (auth.uid() = responder_id);

-- evaluations
CREATE POLICY "Users can delete own evaluations"
ON public.evaluations
FOR DELETE
USING (auth.uid() = user_id);

-- daily_checks
CREATE POLICY "Users can delete own daily checks"
ON public.daily_checks
FOR DELETE
USING (auth.uid() = user_id);

-- weekly_entries
CREATE POLICY "Users can delete own entries"
ON public.weekly_entries
FOR DELETE
USING (auth.uid() = user_id);

-- prompts
CREATE POLICY "Users can delete own prompts"
ON public.prompts
FOR DELETE
USING (auth.uid() = sender_id);

-- quarterly_goals
CREATE POLICY "Users can delete own goals"
ON public.quarterly_goals
FOR DELETE
USING (auth.uid() = user_id);

-- quick_repairs
CREATE POLICY "Users can delete own quick repairs"
ON public.quick_repairs
FOR DELETE
USING (auth.uid() = user_id);
