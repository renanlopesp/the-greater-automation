-- Fix team_members SELECT RLS policy to allow viewing all members of teams you belong to
-- Previously: user_id = auth.uid() (only see own row)
-- Now: co-membership subquery (see all teammates)

DROP POLICY "Users can view own team memberships" ON public.team_members;

CREATE POLICY "Users can view members of their teams"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
    )
  );
