-- Update handle_new_user_team to also create a free subscription
CREATE OR REPLACE FUNCTION handle_new_user_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
  user_name text;
  team_slug text;
BEGIN
  user_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1));
  team_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.teams (name, slug, plan_id)
  VALUES (user_name || '''s Team', team_slug, 'free')
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');

  INSERT INTO public.usage (team_id, period_start, period_end, steps_used, steps_limit, ai_credits_used, ai_credits_limit)
  VALUES (new_team_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', 0, 1000, 0, 100);

  -- Create free subscription for the new team
  INSERT INTO public.subscriptions (team_id, plan_id, status)
  VALUES (new_team_id, 'free', 'active');

  RETURN NEW;
END;
$$;
