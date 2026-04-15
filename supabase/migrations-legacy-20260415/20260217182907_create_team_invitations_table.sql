-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role team_role NOT NULL DEFAULT 'member'::team_role,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT team_invitations_role_check CHECK (role IN ('admin', 'member')),
  CONSTRAINT team_invitations_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
);

-- Unique constraint: only one pending invite per email per team
CREATE UNIQUE INDEX team_invitations_unique_pending
  ON public.team_invitations (team_id, email)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Team owners/admins can see their team's invitations; invited users can see their own
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
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT: Only owners/admins can create invitations
CREATE POLICY "Team owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: Invited user can accept/decline; owners/admins can cancel
CREATE POLICY "Invited users and team admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- DELETE: Only owners/admins can delete invitations
CREATE POLICY "Team owners and admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Indexes
CREATE INDEX team_invitations_email_idx ON public.team_invitations (email);
CREATE INDEX team_invitations_team_id_idx ON public.team_invitations (team_id);
