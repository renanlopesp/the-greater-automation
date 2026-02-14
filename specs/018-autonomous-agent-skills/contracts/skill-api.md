# Contract: Skill Management API

**Feature**: 018-autonomous-agent-skills
**Type**: Server Actions (not API routes, per constitution VI)

## Save Skill

**Action**: `saveSkillFromExecution`
**File**: `src/lib/actions/agent-skills.ts`

```typescript
interface SaveSkillInput {
  agentId: string
  name: string
  description?: string
  // The tool calls from the conversation that form the skill
  toolCalls: Array<{
    action: string // e.g., "GITHUB_CREATE_ISSUE"
    appId: string // e.g., "github"
    inputs: Record<string, unknown>
  }>
}

interface SaveSkillResult {
  success: boolean
  skillId?: string
  error?: string
}

export async function saveSkillFromExecution(input: SaveSkillInput): Promise<SaveSkillResult>
```

**Validation** (Zod):

```typescript
const saveSkillSchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  toolCalls: z
    .array(
      z.object({
        action: z.string().min(1),
        appId: z.string().min(1),
        inputs: z.record(z.unknown()),
      })
    )
    .min(1)
    .max(20),
})
```

**Flow**:

1. Authenticate user
2. Validate input
3. Build action_template from toolCalls:
   - Single tool call → `{ type: "single", action: { name, app_id, parameter_template } }`
   - Multiple tool calls → `{ type: "multi", steps: [...] }`
4. Insert into `agent_skills` with `source: 'dynamic'`
5. Return skill ID

**Template Parameter Detection**:
When saving a skill, values that appear to be context-specific (e.g., a specific issue title, a URL, a channel name) are converted to `{{placeholder}}` variables. The AI fills these in when the skill is later invoked.

Simple heuristic: parameters whose values came directly from the user's message become placeholders. Parameters that were constant (e.g., repo owner, default channel) remain fixed.

## Invoke Skill

Skills are invoked through the normal chat flow. When a user says "Run the Daily PR Summary", the AI:

1. Sees the skill in its system prompt (loaded from `agent_skills`)
2. Recognizes the skill name
3. Executes the tool calls from the skill's `action_template`

**System prompt injection for skills**:

```
You have the following saved skills you can run:

- "Quick Bug Report" (dynamic): Creates a GitHub issue in relay repo.
  Actions: GITHUB_CREATE_ISSUE(owner=renanlopesp, repo=relay, title={{title}}, body={{body}})

- "Daily PR Summary" (dynamic): Checks open PRs and sends summary to Slack.
  Actions:
  1. GITHUB_LIST_PRS(owner=renanlopesp, repo=relay, state=open)
  2. SLACK_SEND_MESSAGE(channel=#engineering, text={{summary of PRs}})

When a user asks to run a skill, execute the actions in the skill template.
Fill in {{placeholders}} from the conversation context or ask the user.
```

## Delete Skill

**Action**: `deleteSkill`

```typescript
export async function deleteSkill(
  agentId: string,
  skillId: string
): Promise<{ success: boolean; error?: string }>
```

**Flow**:

1. Authenticate user
2. Verify skill belongs to agent and user has access
3. DELETE FROM agent_skills WHERE id = skillId AND agent_id = agentId

## List Skills

**Query**: `getAgentSkills`
**File**: `src/lib/queries/agent-conversations.ts` (or separate file)

```typescript
interface AgentSkillWithDetails {
  id: string
  name: string
  description: string | null
  source: 'manual' | 'dynamic'
  action_template: ActionTemplate | null
  workflow_id: string | null
  run_count: number
  last_run_at: string | null
}

export async function getAgentSkills(
  supabase: Client,
  agentId: string
): Promise<AgentSkillWithDetails[]>
```

Returns all skills for an agent, both manual (workflow-linked) and dynamic (action-template).
