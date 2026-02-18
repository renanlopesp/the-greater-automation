-- Fix team_members mutation policies that had self-referencing subqueries causing
-- infinite recursion. Uses SECURITY DEFINER functions to bypass RLS.
-- Also adds support for invited users to join teams.

-- Function to check admin/owner role (bypasses team_members RLS)
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

-- Function to check pending invitation (bypasses team_invitations RLS)
CREATE OR REPLACE FUNCTION public.has_pending_invitation(user_email text, target_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE team_id = target_team_id
      AND email = user_email
      AND status = 'pending'
      AND expires_at > now()
  );
$$;

-- Fix INSERT policy for admins/owners
DROP POLICY IF EXISTS "Team owners/admins can insert members" ON public.team_members;

CREATE POLICY "Team owners/admins can insert members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );

-- Add INSERT policy for invited users to join
CREATE POLICY "Invited users can join team"
  ON public.team_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    public.has_pending_invitation(
      public.get_user_email(auth.uid()),
      team_id
    )
  );

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Team owners/admins can update members" ON public.team_members;

CREATE POLICY "Team owners/admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );

-- Fix DELETE policy
DROP POLICY IF EXISTS "Team owners/admins can delete members" ON public.team_members;

CREATE POLICY "Team owners/admins can delete members"
  ON public.team_members FOR DELETE
  USING (
    public.is_team_admin_or_owner(auth.uid(), team_id)
  );
