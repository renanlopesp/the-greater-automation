-- Backfill orchestrator agents for existing teams that have has_store = true
-- but no agent with is_orchestrator = true.
--
-- Uses a LEFT JOIN to the owner row so teams without an owner still get an
-- orchestrator (created_by falls back to the first member, or NULL if the
-- agents table allows it — but created_by is NOT NULL, so we skip ownerless
-- teams via the HAVING / WHERE filter below).

INSERT INTO agents (
  team_id,
  created_by,
  name,
  description,
  system_prompt,
  palette,
  model,
  is_orchestrator
)
SELECT
  t.id                  AS team_id,
  owner_member.user_id  AS created_by,
  'Snew'                AS name,
  'Seu assistente central — pergunte qualquer coisa e ele direciona ao especialista certo ou responde diretamente.' AS description,
  NULL                  AS system_prompt,
  'indigo'              AS palette,
  'gpt-4o'              AS model,
  true                  AS is_orchestrator
FROM teams t
-- find the owner of each team
LEFT JOIN team_members owner_member
  ON owner_member.team_id = t.id
 AND owner_member.role = 'owner'
-- only teams that have a store
WHERE t.has_store = true
-- only teams that have no orchestrator yet
  AND NOT EXISTS (
    SELECT 1
    FROM agents a
    WHERE a.team_id = t.id
      AND a.is_orchestrator = true
  )
-- skip teams with no owner (created_by is NOT NULL on the agents table)
  AND owner_member.user_id IS NOT NULL;

-- Prevent duplicate orchestrators per team going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_orchestrator_per_team
  ON agents (team_id) WHERE is_orchestrator = true;
