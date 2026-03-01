
-- Create onboarding_steps table
CREATE TABLE public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid,
  step_number integer NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(user_id, step_number)
);

ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own steps" ON public.onboarding_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Read partner steps" ON public.onboarding_steps FOR SELECT USING (couple_id = get_my_couple_id());
CREATE POLICY "Insert own steps" ON public.onboarding_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own steps" ON public.onboarding_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own steps" ON public.onboarding_steps FOR DELETE USING (auth.uid() = user_id);

-- Add meeting_confirmed to weekly_entries
ALTER TABLE public.weekly_entries ADD COLUMN IF NOT EXISTS meeting_confirmed boolean DEFAULT false;
