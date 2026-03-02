
ALTER FUNCTION public.handle_new_user_team() SET search_path = 'public';
ALTER FUNCTION public.update_team_usage_on_run_complete() SET search_path = 'public';
ALTER FUNCTION public.increment_ai_credits(uuid, numeric) SET search_path = 'public';
