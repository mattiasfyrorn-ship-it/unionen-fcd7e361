
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  couple_id UUID,
  pairing_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Couples table
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- Add foreign key for couple_id
ALTER TABLE public.profiles ADD CONSTRAINT fk_couple FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;

-- Weekly evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('health', 'career', 'economy', 'relationships')),
  score INT NOT NULL CHECK (score >= 1 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, area)
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Monthly priorities
CREATE TABLE public.priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('health', 'career', 'economy', 'relationships')),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

-- Prompts/messages
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('longing', 'need')),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Enable realtime for prompts
ALTER PUBLICATION supabase_realtime ADD TABLE public.prompts;

-- RLS Policies

-- Profiles: users can read own + partner's profile (same couple)
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read partner profile" ON public.profiles FOR SELECT USING (
  couple_id IS NOT NULL AND couple_id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Couples: members can read their couple
CREATE POLICY "Couple members can read" ON public.couples FOR SELECT USING (
  id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);
CREATE POLICY "Authenticated can create couples" ON public.couples FOR INSERT TO authenticated WITH CHECK (true);

-- Evaluations: couple members can read, users can insert/update own
CREATE POLICY "Read couple evaluations" ON public.evaluations FOR SELECT USING (
  couple_id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);
CREATE POLICY "Insert own evaluations" ON public.evaluations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own evaluations" ON public.evaluations FOR UPDATE USING (auth.uid() = user_id);

-- Priorities: couple members can read, users can manage own
CREATE POLICY "Read couple priorities" ON public.priorities FOR SELECT USING (
  couple_id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);
CREATE POLICY "Insert own priorities" ON public.priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own priorities" ON public.priorities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own priorities" ON public.priorities FOR DELETE USING (auth.uid() = user_id);

-- Prompts: couple members can read, users can insert own
CREATE POLICY "Read couple prompts" ON public.prompts FOR SELECT USING (
  couple_id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);
CREATE POLICY "Insert own prompts" ON public.prompts FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Update own prompts" ON public.prompts FOR UPDATE USING (
  couple_id IN (SELECT couple_id FROM public.profiles WHERE user_id = auth.uid() AND couple_id IS NOT NULL)
);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
