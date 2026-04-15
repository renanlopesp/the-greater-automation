-- Fix team_invitations RLS policies that use a subquery on profiles table.
-- The profiles table has RLS enabled, which can cause the subquery to return NULL
-- when evaluated inside another table's RLS policy context.
-- Solution: Use the get_user_email() SECURITY DEFINER function.
-- Also fix teams and profiles SELECT policies for full member management support.

-- Fix team_invitations SELECT policy
DROP POLICY IF EXISTS "Team owners and admins can view invitations" ON public.team_invitations;

CREATE POLICY "Team owners and admins can view invitations"
  ON public.team_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
    OR
    email = public.get_user_email(auth.uid())
  );

-- Fix team_invitations UPDATE policy
DROP POLICY IF EXISTS "Invited users and team admins can update invitations" ON public.team_invitations;

CREATE POLICY "Invited users and team admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    email = public.get_user_email(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Fix teams SELECT RLS to allow invited users to see team info
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

-- Fix profiles SELECT RLS to allow viewing teammates' profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own and teammates profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR
    id IN (
      SELECT tm.user_id FROM public.team_members tm
      WHERE tm.team_id IN (SELECT public.get_user_team_ids(auth.uid()))
    )
  );
