-- Fix teams SELECT RLS policy to allow invited users to see the team name.
-- Without this, the teams!inner() join in fetchPendingInvitationsForUser
-- silently filters out invitations because the invited user isn't a member yet
-- and can't see the team row.

-- Update the SELECT policy to also allow users with pending invitations
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;

CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.team_id = teams.id
        AND ti.email = public.get_user_email(auth.uid())
        AND ti.status = 'pending'
        AND ti.expires_at > now()
    )
  );
