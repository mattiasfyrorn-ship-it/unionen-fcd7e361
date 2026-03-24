
CREATE TABLE public.reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  couple_id UUID REFERENCES public.couples(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reflections" ON public.reflections FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own reflections" ON public.reflections FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reflections" ON public.reflections FOR DELETE TO public USING (auth.uid() = user_id);
CREATE POLICY "Read couple reflections" ON public.reflections FOR SELECT TO public USING (couple_id = get_my_couple_id());
