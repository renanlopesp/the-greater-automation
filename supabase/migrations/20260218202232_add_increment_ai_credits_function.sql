-- RPC function to atomically increment AI credits for a team
-- Used by agent chat route to track token usage
CREATE OR REPLACE FUNCTION increment_ai_credits(p_team_id UUID, p_credits NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usage
  SET ai_credits_used = ai_credits_used + p_credits,
      updated_at = now()
  WHERE team_id = p_team_id
    AND period_start <= now()
    AND period_end >= now();
END;
$$;
