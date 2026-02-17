-- Fix profiles SELECT RLS to allow viewing teammates' profiles.
-- The original policy (auth.uid() = id) only allows viewing your own profile.
-- When fetchTeamMembers joins team_members with profiles!inner, other members'
-- profiles are filtered out, so only the current user appears in the list.
--
-- Solution: Allow users to see profiles of anyone on the same team.
-- Uses get_user_team_ids() SECURITY DEFINER function to avoid recursion.

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
