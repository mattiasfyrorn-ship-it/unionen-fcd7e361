CREATE POLICY "Users can read own evaluations"
ON public.evaluations FOR SELECT
USING (auth.uid() = user_id);