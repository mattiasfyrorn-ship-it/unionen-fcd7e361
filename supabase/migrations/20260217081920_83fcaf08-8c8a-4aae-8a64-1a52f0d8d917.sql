
-- Create messages table for partner communication
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Read couple messages" ON public.messages
  FOR SELECT USING (
    couple_id IN (
      SELECT profiles.couple_id FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
    )
  );

CREATE POLICY "Update couple messages" ON public.messages
  FOR UPDATE USING (
    couple_id IN (
      SELECT profiles.couple_id FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create quick_repairs table
CREATE TABLE public.quick_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  category text,
  phrase text,
  delivery text,
  partner_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert own quick repairs" ON public.quick_repairs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Read couple quick repairs" ON public.quick_repairs
  FOR SELECT USING (
    couple_id IN (
      SELECT profiles.couple_id FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
    )
  );

CREATE POLICY "Update couple quick repairs" ON public.quick_repairs
  FOR UPDATE USING (
    couple_id IN (
      SELECT profiles.couple_id FROM profiles
      WHERE profiles.user_id = auth.uid() AND profiles.couple_id IS NOT NULL
    )
  );
