# Research: Structured Skills & Terminology Alignment

## R1: Migration Strategy for Table Renames

**Decision**: Use `ALTER TABLE RENAME` with sequential renames to avoid name collision.

**Rationale**: PostgreSQL `ALTER TABLE RENAME` is a metadata-only operation (no data copy, instant). However, since `agent_knowledge_skills` needs to become `agent_skills` and the current `agent_skills` also exists, we must rename in correct order:

1. First: `agent_skills` → `agent_workflows` (frees up the name)
2. Second: `agent_knowledge_skills` → `agent_skills` (takes the freed name)
3. Third: `agent_skill_runs` → `agent_workflow_runs`

**Alternatives considered**:

- Create new tables and migrate data: Rejected — unnecessary for a rename, adds downtime risk.
- Use views as aliases: Rejected — adds complexity without benefit, Supabase RLS doesn't work well with views.

## R2: Foreign Key and Index Updates

**Decision**: PostgreSQL automatically updates FK constraint names when tables are renamed. We only need to explicitly rename indexes and RLS policies for clarity.

**Rationale**: After `ALTER TABLE agent_skills RENAME TO agent_workflows`, the FK `agent_skill_runs_skill_id_fkey` still works but references the renamed table. The constraint name is cosmetic — only rename if it causes confusion.

**What needs explicit rename**:

- Indexes: `idx_skill_runs_skill_id` → `idx_workflow_runs_workflow_id` etc.
- RLS policies: "Team members can view skills" → "Team members can view workflows"
- FK column name: `agent_skill_runs.skill_id` → `agent_workflow_runs.workflow_id`

## R3: API Route Rename Strategy

**Decision**: Rename `/api/skills/*` routes to `/api/workflows/*` since they handle workflow execution (not knowledge skills). Keep no backward-compat aliases.

**Rationale**: These routes are internal (called from our own UI/tools, not external consumers). The webhook route (`/api/skills/webhook/[token]`) is also internal — webhook tokens are stored in the DB and can reference the new path.

**Affected routes**:

- `/api/skills/[id]/execute` → `/api/workflows/[id]/execute` (already has overlap with existing `/api/workflows/[id]`)
- `/api/skills/webhook/[token]` → `/api/workflows/webhook/[token]` (conflicts with existing `/api/workflows/webhook/[token]`)
- `/api/skills/cron` → `/api/workflows/cron`

**Conflict resolution**: The existing `/api/workflows/webhook/[token]` handles legacy workflow triggers. The `/api/skills/webhook/[token]` handles rule-based skill triggers. These should be merged into a single route that handles both, or kept separate under `/api/workflows/rules/webhook/[token]`.

**Decision**: Keep existing `/api/workflows/webhook/[token]` for workflow-editor triggers. Move skill/rule triggers to `/api/agent-workflows/webhook/[token]` to distinguish agent-level automations from workflow-editor automations.

## R4: Skill Content Structure

**Decision**: Use structured markdown with `## ` headers as section delimiters. Content is stored as plain text in the DB — parsing happens at read time.

**Rationale**: Storing structured data as markdown keeps the DB simple (single text column), makes skills human-readable, and allows the agent to create/edit skills naturally. Parsing `## ` headers is trivial and reliable.

**Knowledge skill template**:

```markdown
## Description

[When this skill applies and what it does]

## Instructions

[Step-by-step guidance for the agent]

## Examples

- **Input**: [example input]
  **Output**: [expected response]

## Constraints

- [Rule 1]
- [Rule 2]

## References

- [Link or doc reference]
```

**Procedure skill template**:

```markdown
## Description

[What this procedure does]

## Parameters

- `branch` (string, required): The git branch to deploy
- `environment` (enum: staging|production, required): Target environment

## Steps

1. **Create Pull Request**: Call `GITHUB_CREATE_PULL_REQUEST` with title="Deploy {{branch}}", base="main", head="{{branch}}"
2. **Wait for CI**: Call `GITHUB_GET_PULL_REQUEST_STATUS` and check status is "success"
3. **Merge PR**: Call `GITHUB_MERGE_PULL_REQUEST` with pr_number="{{prev.pr_number}}"
4. **Notify Team**: Call `SLACK_SEND_MESSAGE` with channel="#deploys", message="Deployed {{branch}} to {{environment}}"

## Error Handling

- If Step 2 fails: Notify user and ask whether to force-merge or abort
- If Step 3 fails: Retry once, then report error
```

## R5: Procedure Skill Execution Engine

**Decision**: Procedure skills execute via the agent's existing multi-step tool loop — the agent reads the procedure steps and calls the referenced tools in sequence. No separate execution runtime.

**Rationale**: The agent already has access to all Composio tools. A procedure skill is essentially a "recipe" the agent follows during conversation. The `SNEW_EXECUTE_SKILL` tool loads the procedure, and the agent interprets each step and calls the corresponding tools. This is simpler than building a separate execution engine and leverages the LLM's ability to handle edge cases, user questions, and errors naturally.

**Alternatives considered**:

- Server-side execution engine (like workflow executor): Rejected — would duplicate Composio tool infrastructure, lose conversation context, and can't handle interactive steps.
- Compile procedures to workflow rules: Rejected — procedures are conversational (on-demand), workflows are trigger-based. Different execution models.

## R6: Progressive Disclosure Implementation

**Decision**: System prompt includes skill metadata only. Agent calls `SNEW_GET_SKILL_CONTENT` to load full content when needed.

**Rationale**: With 10+ skills, injecting all content into the system prompt wastes thousands of tokens. The metadata (name + type + description) is enough for the agent to decide relevance. Loading on demand is analogous to Codex's progressive disclosure model.

**System prompt format**:

```
## Your Skills
You have the following skills. Use SNEW_GET_SKILL_CONTENT to load full details when relevant.

- **Deploy Process** (procedure): Automated deployment pipeline for staging/production
- **Customer Support Guide** (knowledge): Guidelines for handling customer inquiries
- **Bug Report Template** (knowledge): Standard format for filing bug reports
```

## R7: File Rename Inventory

**Complete rename map** (from research):

| Current Path                                                 | New Path                       | Reason                           |
| ------------------------------------------------------------ | ------------------------------ | -------------------------------- |
| `src/components/agent-detail/skills-list.tsx`                | `workflows-list.tsx`           | Shows automations                |
| `src/components/agent-detail/knowledge-skills-list.tsx`      | `skills-list.tsx`              | Shows knowledge skills           |
| `src/lib/actions/agent-skills.ts`                            | `agent-workflows.ts`           | CRUD for automations             |
| `src/lib/actions/agent-knowledge-skills.ts`                  | `agent-skills.ts`              | CRUD for knowledge skills        |
| `src/hooks/use-agent-skills.ts`                              | `use-agent-workflows.ts`       | Query for automations            |
| `src/lib/queries/skill-runs.ts`                              | `workflow-runs.ts`             | Query for run history            |
| `src/lib/skills/` (directory)                                | `src/lib/workflows/`           | Execution engine for automations |
| `src/app/api/skills/`                                        | `src/app/api/agent-workflows/` | API routes for automations       |
| `src/components/agent-detail/__tests__/skills-list.test.tsx` | `workflows-list.test.tsx`      | Test for automations             |
| `src/lib/actions/__tests__/agent-knowledge-skills.test.ts`   | `agent-skills.test.ts`         | Test for knowledge skills        |
