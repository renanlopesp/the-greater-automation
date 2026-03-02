-- Create a dedicated updated_at trigger function for trigger_subscriptions
-- with explicit search_path to satisfy Supabase security advisors
CREATE OR REPLACE FUNCTION update_trigger_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop old trigger if it used the generic update_updated_at function
DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON trigger_subscriptions;

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON trigger_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_trigger_subscriptions_updated_at();
