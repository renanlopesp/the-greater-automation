-- Fix infinite recursion in team_members SELECT RLS policy.
-- The self-referencing subquery (EXISTS SELECT FROM team_members WHERE ...) causes
-- PostgreSQL to apply RLS recursively, triggering infinite recursion detection.
-- Solution: Use a SECURITY DEFINER function that bypasses RLS to check membership.

-- Step 1: Create a SECURITY DEFINER function to get user's team IDs without RLS
CREATE OR REPLACE FUNCTION public.get_user_team_ids(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = user_uuid;
$$;

-- Step 2: Drop the broken self-referencing policy
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;

-- Step 3: Create new policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Users can view members of their teams"
  ON public.team_members FOR SELECT
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Step 4: Create a SECURITY DEFINER function to check admin/owner role
-- This is needed by INSERT, UPDATE, DELETE policies which also had self-referencing subqueries.
CREATE OR REPLACE FUNCTION public.is_team_admin_or_owner(user_uuid uuid, target_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = target_team_id
      AND user_id = user_uuid
      AND role IN ('owner', 'admin')
  );
$$;

-- Step 5: Fix INSERT policy
DROP POLICY IF EXISTS "Team owners/admins can insert members" ON public.team_members;

CREATE POLICY "Team owners/admins can insert members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );

-- Step 6: Fix UPDATE policy
DROP POLICY IF EXISTS "Team owners/admins can update members" ON public.team_members;

CREATE POLICY "Team owners/admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );

-- Step 7: Fix DELETE policy
DROP POLICY IF EXISTS "Team owners/admins can delete members" ON public.team_members;

CREATE POLICY "Team owners/admins can delete members"
  ON public.team_members FOR DELETE
  USING (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );
