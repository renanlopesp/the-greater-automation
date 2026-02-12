-- Enums
CREATE TYPE workflow_status AS ENUM ('draft', 'published');
CREATE TYPE trigger_type AS ENUM ('manual', 'scheduled', 'webhook', 'form', 'rss', 'mailhook', 'table', 'mcp', 'app');
CREATE TYPE step_type AS ENUM ('app', 'ai', 'flow_control', 'web_scraping', 'human_in_loop', 'utility', 'http', 'sequence');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error');

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_team_id uuid;
  user_name text;
  team_slug text;
BEGIN
  user_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1));
  team_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.teams (name, slug)
  VALUES (user_name || '''s Team', team_slug)
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  INSERT INTO public.usage (team_id, period_start, period_end, steps_used, steps_limit, ai_credits_used, ai_credits_limit)
  VALUES (new_team_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 0, 1000, 0, 100);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION interval_to_cron(p_interval_value integer, p_interval_unit text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_interval_unit
    WHEN 'minutes' THEN '*/' || p_interval_value || ' * * * *'
    WHEN 'hours'   THEN '0 */' || p_interval_value || ' * * *'
    WHEN 'days'    THEN '0 0 */' || p_interval_value || ' * *'
    WHEN 'weeks'   THEN '0 0 * * 0'
    ELSE NULL
  END;
END;
$$;
