-- Allow users with valid pending invitations to insert themselves into team_members.
-- Without this, only existing owners/admins can insert rows, so accepting an
-- invitation from the invited user's side would be blocked by RLS.
--
-- Uses a SECURITY DEFINER function to check team_invitations without triggering
-- RLS, which would otherwise cause infinite recursion (team_members INSERT policy
-- → team_invitations SELECT policy → team_members SELECT policy → ...).

-- Step 1: Create SECURITY DEFINER function to check pending invitation
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

-- Step 2: Create INSERT policy using SECURITY DEFINER functions (no recursion)
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
