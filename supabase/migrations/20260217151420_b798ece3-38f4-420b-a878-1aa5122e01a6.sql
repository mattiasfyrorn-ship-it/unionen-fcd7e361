
-- 1. Create helper function
CREATE OR REPLACE FUNCTION public.get_my_couple_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_couple_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_couple_id TO authenticated;

-- 2. Fix profiles partner policy
DROP POLICY IF EXISTS "Users can read partner profile" ON public.profiles;
CREATE POLICY "Users can read partner profile" ON public.profiles
  FOR SELECT USING (
    couple_id IS NOT NULL
    AND couple_id = public.get_my_couple_id()
  );

-- 3. couples
DROP POLICY IF EXISTS "Couple members can read" ON public.couples;
CREATE POLICY "Couple members can read" ON public.couples
  FOR SELECT USING (id = public.get_my_couple_id());

-- 4. daily_checks
DROP POLICY IF EXISTS "Read couple daily checks" ON public.daily_checks;
CREATE POLICY "Read couple daily checks" ON public.daily_checks
  FOR SELECT USING (couple_id = public.get_my_couple_id());

-- 5. evaluations
DROP POLICY IF EXISTS "Read couple evaluations" ON public.evaluations;
CREATE POLICY "Read couple evaluations" ON public.evaluations
  FOR SELECT USING (couple_id = public.get_my_couple_id());

-- 6. messages
DROP POLICY IF EXISTS "Read couple messages" ON public.messages;
CREATE POLICY "Read couple messages" ON public.messages
  FOR SELECT USING (couple_id = public.get_my_couple_id());

DROP POLICY IF EXISTS "Update couple messages" ON public.messages;
CREATE POLICY "Update couple messages" ON public.messages
  FOR UPDATE USING (couple_id = public.get_my_couple_id());

-- 7. priorities
DROP POLICY IF EXISTS "Read couple priorities" ON public.priorities;
CREATE POLICY "Read couple priorities" ON public.priorities
  FOR SELECT USING (couple_id = public.get_my_couple_id());

-- 8. prompts
DROP POLICY IF EXISTS "Read couple prompts" ON public.prompts;
CREATE POLICY "Read couple prompts" ON public.prompts
  FOR SELECT USING (couple_id = public.get_my_couple_id());

DROP POLICY IF EXISTS "Update own prompts" ON public.prompts;
CREATE POLICY "Update own prompts" ON public.prompts
  FOR UPDATE USING (couple_id = public.get_my_couple_id());

-- 9. quick_repairs
DROP POLICY IF EXISTS "Read couple quick repairs" ON public.quick_repairs;
CREATE POLICY "Read couple quick repairs" ON public.quick_repairs
  FOR SELECT USING (couple_id = public.get_my_couple_id());

DROP POLICY IF EXISTS "Update couple quick repairs" ON public.quick_repairs;
CREATE POLICY "Update couple quick repairs" ON public.quick_repairs
  FOR UPDATE USING (couple_id = public.get_my_couple_id());

-- 10. repairs
DROP POLICY IF EXISTS "Partners can read couple repairs" ON public.repairs;
CREATE POLICY "Partners can read couple repairs" ON public.repairs
  FOR SELECT USING (couple_id = public.get_my_couple_id());

-- 11. repair_responses (nested subquery on profiles via repairs)
DROP POLICY IF EXISTS "Users can read couple responses" ON public.repair_responses;
CREATE POLICY "Users can read couple responses" ON public.repair_responses
  FOR SELECT USING (
    repair_id IN (
      SELECT r.id FROM repairs r WHERE r.couple_id = public.get_my_couple_id()
    )
  );

-- 12. weekly_conversations
DROP POLICY IF EXISTS "Couple members can manage conversations" ON public.weekly_conversations;
CREATE POLICY "Couple members can manage conversations" ON public.weekly_conversations
  FOR ALL USING (couple_id = public.get_my_couple_id());

-- 13. weekly_entries
DROP POLICY IF EXISTS "Read couple entries" ON public.weekly_entries;
CREATE POLICY "Read couple entries" ON public.weekly_entries
  FOR SELECT USING (
    conversation_id IN (
      SELECT wc.id FROM weekly_conversations wc WHERE wc.couple_id = public.get_my_couple_id()
    )
  );
