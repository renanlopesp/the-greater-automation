-- Fix team_invitations RLS policies that use a subquery on profiles table.
-- The profiles table has RLS enabled, which can cause the subquery to return NULL
-- when evaluated inside another table's RLS policy context.
-- Solution: Use a SECURITY DEFINER function to bypass profiles RLS.

-- Step 1: Create a SECURITY DEFINER function to get user's email
CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM public.profiles WHERE id = user_uuid;
$$;

-- Step 2: Drop and recreate the SELECT policy
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

-- Step 3: Drop and recreate the UPDATE policy (same issue)
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
