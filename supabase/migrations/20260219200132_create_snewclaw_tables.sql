-- SnewClaw (OpenClaw) instance management tables

CREATE TABLE IF NOT EXISTS public.snewclaw_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  fly_machine_id text,
  fly_volume_id text,
  status text NOT NULL DEFAULT 'not_provisioned',
  region text NOT NULL DEFAULT 'gru',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  last_activity_at timestamptz,
  last_health_check_at timestamptz,
  consecutive_failures int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.snewclaw_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.snewclaw_instances(id) ON DELETE CASCADE,
  command text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.snewclaw_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES public.snewclaw_instances(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.snewclaw_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.snewclaw_instances(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.snewclaw_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  encrypted_value text NOT NULL,
  iv text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.snewclaw_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snewclaw_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snewclaw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snewclaw_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snewclaw_secrets ENABLE ROW LEVEL SECURITY;
