# Implementation Plan: Skills vs Workflows Restructure

## Architecture Overview

The core change separates two concepts that are currently conflated in `agent_skills`:

1. **Agent Skills** (NEW) — Embedded knowledge/instructions stored in a new `agent_knowledge_skills` table. Injected into the agent's system prompt during chat. CRUD via new LLM tools (SKILL_CREATE, SKILL_LIST, SKILL_DELETE) and UI.

2. **Agent Workflows** (EXISTING) — WHEN→IF→THEN automations. The current `agent_skills` table with `source='rule'` already has `workflow_id` linking to the `workflows` table. We keep this link but rename the concept. The `agent_skills` table is repurposed as a join table (`agent_workflows`) linking agents to workflows.

### Data Flow

```
Agent Chat → LLM detects "create automation" → WORKFLOW_CREATE tool → workflows + agent_skills (join)
Agent Chat → LLM detects "remember this" → SKILL_CREATE tool → agent_knowledge_skills
Agent Chat → system prompt includes agent_knowledge_skills content as context
```

## Phase 1: Database — New `agent_knowledge_skills` Table

**Migration**: `create_agent_knowledge_skills`

```sql
CREATE TABLE agent_knowledge_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,  -- The instruction/knowledge text
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'chat')),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, name)
);
```

RLS policies mirror `agent_skills` (team-based access + service role).

**No migration needed for existing data** — `agent_skills` with `source='rule'` stays as workflow links. `source='manual'|'dynamic'` are legacy and can remain (backward compat).

## Phase 2: Backend — LLM Tool Rename & New Skill Tools

### File: `src/lib/ai/skill-builder-tools.ts`

Rename existing tools:

- `SNEW_LIST_APP_ACTIONS` → `SNEW_LIST_APP_ACTIONS` (keep — app discovery is neutral)
- `SNEW_CREATE_SKILL` → `SNEW_CREATE_WORKFLOW` (creates automation)
- `SNEW_LIST_SKILLS` → `SNEW_LIST_WORKFLOWS` (lists automations)
- `SNEW_UPDATE_SKILL` → `SNEW_UPDATE_WORKFLOW`
- `SNEW_DELETE_SKILL` → `SNEW_DELETE_WORKFLOW`
- `SNEW_TEST_SKILL` → `SNEW_TEST_WORKFLOW`
- `SNEW_CHECK_CONNECTIONS` → `SNEW_CHECK_CONNECTIONS` (keep)

Add new skill tools:

- `SNEW_CREATE_SKILL` — Create knowledge skill (name, description, content) → inserts into `agent_knowledge_skills`
- `SNEW_LIST_SKILLS` — List knowledge skills for this agent
- `SNEW_DELETE_SKILL` — Delete a knowledge skill

### File: `src/lib/ai/agent-chat.ts`

Update `buildAgentSystemPrompt()`:

- Query `agent_knowledge_skills` and inject their content into the system prompt
- Separate "Workflow Capabilities" section from "Agent Skills/Knowledge" section
- Update terminology throughout

### File: `src/app/api/agents/[id]/chat/route.ts`

- Load `agent_knowledge_skills` alongside `agent_skills`
- Pass knowledge skills to system prompt builder

## Phase 3: UI — Agent Sidebar Tabs

### File: `src/components/agent-detail/agent-sidebar.tsx`

Replace single `SkillsList` with tabbed interface:

- Tab "Workflows" → shows rule-based automations (current `ruleSkills`)
- Tab "Skills" → shows knowledge skills from `agent_knowledge_skills`

### New Component: `src/components/agent-detail/knowledge-skills-list.tsx`

- Lists knowledge skills with name, description preview, enabled toggle
- "Add Skill" button → inline form or dialog (name, description, content textarea)
- Delete button per skill
- Uses new server actions for CRUD

### Adapt: `src/components/agent-detail/skills-list.tsx`

Rename to `agent-workflows-list.tsx`:

- Only shows `source='rule'` items (automations)
- Label as "Workflows" not "Skills"
- Keep trigger icons, run button, toggle, delete

## Phase 4: Server Actions & API

### New File: `src/lib/actions/agent-knowledge-skills.ts`

```typescript
export async function createKnowledgeSkill(agentId, name, description, content): ActionResult
export async function updateKnowledgeSkill(skillId, updates): ActionResult
export async function deleteKnowledgeSkill(skillId, agentId): ActionResult
export async function toggleKnowledgeSkill(skillId, enabled): ActionResult
```

### Update: `src/lib/actions/agent-skills.ts`

- Keep existing functions for workflow-linked skills (backward compat)
- Clarify naming in comments

## Phase 5: Skill Injection into System Prompt

### File: `src/lib/ai/agent-chat.ts`

In `buildAgentSystemPrompt()`, add a section:

```
## Your Knowledge & Skills
The following skills define your specialized knowledge. Use them when relevant:

### [Skill Name]
[Skill content/instructions]

### [Skill Name 2]
[Skill content/instructions]
```

This makes skills part of the agent's "personality" and influences responses contextually.

## Phase 6: Testing

### Unit Tests (Vitest)

- `src/lib/actions/__tests__/agent-knowledge-skills.test.ts` — CRUD operations
- `src/lib/ai/__tests__/agent-chat.test.ts` — System prompt includes skills
- `src/lib/ai/__tests__/skill-builder-tools.test.ts` — Tool rename verification

### E2E Tests (Playwright)

- `e2e/agent-skills-workflows.spec.ts` — Navigate to agent, verify tabs, create skill via UI, verify it appears
- `e2e/agent-chat-workflow.spec.ts` — Chat creates workflow, verify in Workflows tab

## Risk Assessment

| Risk                        | Impact | Mitigation                                                         |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| Existing webhooks break     | High   | Webhook routes are unchanged, only `agent_skills` naming changes   |
| Cron jobs break             | High   | Cron route queries `agent_skills` with `source='rule'` — unchanged |
| LLM confused by tool rename | Medium | System prompt explicitly explains workflow vs skill distinction    |
| Data migration issues       | Low    | No data migration needed — new table, existing stays               |

## File Change Summary

| File                                                    | Change                                     |
| ------------------------------------------------------- | ------------------------------------------ |
| `supabase/migrations/`                                  | New migration for `agent_knowledge_skills` |
| `src/lib/ai/skill-builder-tools.ts`                     | Rename tools + add skill tools             |
| `src/lib/ai/agent-chat.ts`                              | Update system prompt, inject skills        |
| `src/app/api/agents/[id]/chat/route.ts`                 | Load knowledge skills                      |
| `src/components/agent-detail/agent-sidebar.tsx`         | Add tabs                                   |
| `src/components/agent-detail/skills-list.tsx`           | Rename to workflows list                   |
| `src/components/agent-detail/knowledge-skills-list.tsx` | NEW — skills UI                            |
| `src/lib/actions/agent-knowledge-skills.ts`             | NEW — server actions                       |
| `src/lib/supabase/database.types.ts`                    | Regenerate types                           |
