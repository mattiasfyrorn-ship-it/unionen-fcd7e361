-- Idempotency table for webhook deduplication
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id text UNIQUE NOT NULL,
  event_type text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- GHL contact to auth user mapping
CREATE TABLE public.ghl_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ghl_contact_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ghl_links ENABLE ROW LEVEL SECURITY;