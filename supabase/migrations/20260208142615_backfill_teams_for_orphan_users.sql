-- One-time backfill: create teams for profiles that don't have one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id, p.email, p.full_name
    FROM profiles p
    LEFT JOIN team_members tm ON tm.user_id = p.id
    WHERE tm.user_id IS NULL
  LOOP
    -- handle_new_user_team trigger handles this on INSERT,
    -- but for existing orphan profiles we manually create teams
    PERFORM handle_new_user_team_backfill(r.id, r.email, r.full_name);
  END LOOP;
EXCEPTION
  WHEN undefined_function THEN
    -- No orphan users, nothing to do
    NULL;
END;
$$;
