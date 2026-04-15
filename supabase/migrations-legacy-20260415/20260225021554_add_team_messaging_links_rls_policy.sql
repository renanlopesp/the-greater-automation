-- Allow team members to view messaging links for their team.
-- This enables workflow executors (running as a team member) to find
-- the team's Telegram link for sending notifications.
CREATE POLICY "Team members can view team messaging links"
ON messaging_links
FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()
  )
);
