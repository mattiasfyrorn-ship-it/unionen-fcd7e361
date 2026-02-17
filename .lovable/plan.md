

## Fix: Infinite Recursion in Profiles RLS Policy

### Problem
The "Users can read partner profile" policy we just created queries the `profiles` table within its own `USING` clause. When Postgres evaluates this policy, it triggers the same policy check on the subquery, creating an infinite loop. This causes **every** request to the `profiles` table to return a 500 error, resulting in a blank screen.

### Solution
Replace the self-referencing subquery with a call to `auth.uid()` directly, using a `SECURITY DEFINER` helper function that bypasses RLS to look up the current user's `couple_id`.

### Steps

1. **Create a helper function** `get_my_couple_id()` that runs as `SECURITY DEFINER` (bypasses RLS) and returns the current user's `couple_id` from the `profiles` table. This breaks the recursion because the function's internal query is not subject to RLS.

2. **Drop and recreate the "Users can read partner profile" policy** to use the helper function instead of a subquery on `profiles`:
   ```sql
   CREATE POLICY "Users can read partner profile" ON public.profiles
     FOR SELECT USING (
       couple_id IS NOT NULL
       AND couple_id = public.get_my_couple_id()
     );
   ```

3. **Update all other policies** that have the same recursive pattern (subquery on `profiles` within a policy on another table). These policies on other tables (e.g., `couples`, `daily_checks`, `evaluations`, `messages`, etc.) also query `profiles`, which now has stricter RLS -- they will also hit recursion. They all need to use `get_my_couple_id()` instead.

   Tables affected:
   - `couples` ("Couple members can read")
   - `daily_checks` ("Read couple daily checks")
   - `evaluations` ("Read couple evaluations")
   - `messages` ("Read couple messages", "Update couple messages")
   - `priorities` ("Read couple priorities")
   - `prompts` ("Read couple prompts", "Update own prompts")
   - `quick_repairs` ("Read couple quick repairs", "Update couple quick repairs")
   - `repairs` ("Partners can read couple repairs")
   - `repair_responses` ("Users can read couple responses")
   - `weekly_conversations` ("Couple members can manage conversations")
   - `weekly_entries` ("Read couple entries")

### Technical Details

**Migration SQL will:**
1. Create `get_my_couple_id()` as `SECURITY DEFINER` with `search_path = public`
2. Drop and recreate the problematic `profiles` partner policy
3. Drop and recreate all policies on other tables that subquery `profiles`, replacing the subquery pattern with `couple_id = public.get_my_couple_id()`

No frontend code changes are needed -- the app will work again once the RLS recursion is resolved.

