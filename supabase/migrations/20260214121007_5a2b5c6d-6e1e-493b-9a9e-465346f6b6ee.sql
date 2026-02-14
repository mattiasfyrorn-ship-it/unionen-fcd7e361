
-- Create repairs table
CREATE TABLE public.repairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  feeling_body TEXT,
  story TEXT,
  needs TEXT[] DEFAULT '{}',
  needs_other TEXT,
  ideal_outcome TEXT,
  observable_fact TEXT,
  interpretation TEXT,
  self_responsibility TEXT,
  request TEXT,
  needs_time_reason TEXT,
  learning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own repairs"
  ON public.repairs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own repairs"
  ON public.repairs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own repairs"
  ON public.repairs FOR UPDATE
  USING (auth.uid() = user_id);

-- Create repair_responses table
CREATE TABLE public.repair_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_id UUID NOT NULL REFERENCES public.repairs(id),
  prompt_id UUID NOT NULL REFERENCES public.prompts(id),
  responder_id UUID NOT NULL,
  response TEXT NOT NULL,
  time_needed TEXT,
  learning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own responses"
  ON public.repair_responses FOR INSERT
  WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Users can read couple responses"
  ON public.repair_responses FOR SELECT
  USING (
    repair_id IN (
      SELECT r.id FROM repairs r
      WHERE r.couple_id IN (
        SELECT p.couple_id FROM profiles p
        WHERE p.user_id = auth.uid() AND p.couple_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update own responses"
  ON public.repair_responses FOR UPDATE
  USING (auth.uid() = responder_id);
