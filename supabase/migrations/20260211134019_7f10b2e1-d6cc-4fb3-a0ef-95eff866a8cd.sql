
-- Daily checks table (Gottman 4 cards)
CREATE TABLE public.daily_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  love_map_question TEXT,
  love_map_answer TEXT,
  love_map_completed BOOLEAN DEFAULT false,
  
  gave_appreciation BOOLEAN DEFAULT false,
  was_present BOOLEAN DEFAULT false,
  appreciation_note TEXT,
  
  turn_toward TEXT CHECK (turn_toward IN ('initiated', 'received_positively', 'missed')),
  turn_toward_example TEXT,
  
  adjusted BOOLEAN DEFAULT false,
  adjusted_note TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, check_date)
);

ALTER TABLE public.daily_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own daily checks" ON public.daily_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Read couple daily checks" ON public.daily_checks
  FOR SELECT USING (couple_id IN (
    SELECT profiles.couple_id FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
  ));

CREATE POLICY "Update own daily checks" ON public.daily_checks
  FOR UPDATE USING (auth.uid() = user_id);

-- Weekly conversations
CREATE TABLE public.weekly_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_id, week_start)
);

ALTER TABLE public.weekly_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can manage conversations" ON public.weekly_conversations
  FOR ALL USING (couple_id IN (
    SELECT profiles.couple_id FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
  ));

-- Weekly conversation entries
CREATE TABLE public.weekly_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.weekly_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  appreciations TEXT[] DEFAULT '{}',
  wins TEXT[] DEFAULT '{}',
  issues JSONB DEFAULT '[]',
  takeaway TEXT,
  ready BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.weekly_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own entries" ON public.weekly_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Read couple entries" ON public.weekly_entries
  FOR SELECT USING (conversation_id IN (
    SELECT wc.id FROM weekly_conversations wc
    WHERE wc.couple_id IN (
      SELECT profiles.couple_id FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
    )
  ));

CREATE POLICY "Update own entries" ON public.weekly_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Love map questions
CREATE TABLE public.love_map_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general'
);

ALTER TABLE public.love_map_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read questions" ON public.love_map_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

INSERT INTO public.love_map_questions (question) VALUES
  ('Vad drömmer din partner om just nu?'),
  ('Vad oroar din partner sig mest för?'),
  ('Vad är din partners favoritminne från barndomen?'),
  ('Vilken är din partners största prestation?'),
  ('Vad gör din partner lyckligast just nu?'),
  ('Vem är din partners närmaste vän och varför?'),
  ('Vad stressar din partner mest på jobbet?'),
  ('Vilken bok, film eller serie berörde din partner senast?'),
  ('Vad skulle din partner göra om hen fick en vecka helt fri?'),
  ('Vad uppskattar din partner mest hos dig?'),
  ('Vilken ny hobby vill din partner testa?'),
  ('Vad är din partners hemliga talang?'),
  ('Hur laddar din partner batterierna bäst?'),
  ('Vad är din partners favoriträtt just nu?'),
  ('Vilken plats i världen vill din partner besöka?'),
  ('Vad gör din partner stolt över sig själv?'),
  ('Vilken typ av stöd behöver din partner mest just nu?'),
  ('Vad var det senaste som fick din partner att skratta riktigt?'),
  ('Hur vill din partner bli tröstad när hen är ledsen?'),
  ('Vad betyder mest för din partner i er relation just nu?');

-- Partner invitations
CREATE TABLE public.partner_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  couple_id UUID NOT NULL REFERENCES public.couples(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own invitations" ON public.partner_invitations
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Read own invitations" ON public.partner_invitations
  FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Update own invitations" ON public.partner_invitations
  FOR UPDATE USING (auth.uid() = inviter_id);
