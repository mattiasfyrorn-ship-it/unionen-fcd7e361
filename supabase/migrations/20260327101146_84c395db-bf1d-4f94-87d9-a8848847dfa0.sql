
CREATE TABLE public.journey_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid REFERENCES public.couples(id),
  day_number integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_number)
);

ALTER TABLE public.journey_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own completions" ON public.journey_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read partner completions" ON public.journey_completions
  FOR SELECT TO authenticated USING (couple_id = get_my_couple_id());

CREATE POLICY "Users can insert own completions" ON public.journey_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions" ON public.journey_completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
