-- Fix team_members SELECT RLS policy to allow viewing all members of teams you belong to.
-- Previously: user_id = auth.uid() (only see own row)
-- Now: uses get_user_team_ids() SECURITY DEFINER function to avoid infinite recursion.

DROP POLICY IF EXISTS "Users can view own team memberships" ON public.team_members;

CREATE POLICY "Users can view members of their teams"
  ON public.team_members FOR SELECT
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));
