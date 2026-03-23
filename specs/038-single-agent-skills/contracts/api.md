# API Contracts: Single Agent + Skills Migration

## Modified Endpoints

### POST /api/chat (Orchestrator — modified)

The main chat endpoint. Modified to load skills instead of agents.

**Request** (unchanged):

```json
{
  "messages": [{ "role": "user", "parts": [{ "type": "text", "text": "..." }] }],
  "conversationId": "uuid (optional)"
}
```

**Response** (unchanged): Streaming text response via Vercel AI SDK.

**Behavioral changes**:

- No longer loads `teamAgents` list for `SNEW_ASK_AGENT`
- Loads `teamSkills` (active skills) from `skills` table
- System prompt built via `buildOrchestratorSystemPrompt()` with skills context instead of agents context
- Platform tools include `SNEW_LIST_SKILLS`, `SNEW_GET_SKILL`, `SNEW_RUN_SKILL` instead of agent tools

### GET /api/agents/[id]/chat (Deprecated)

Returns 410 Gone with redirect guidance.

```json
{
  "error": "This endpoint is deprecated. Use POST /api/chat instead.",
  "redirect": "/api/chat"
}
```

---

## Platform Tools (LLM-facing)

### SNEW_LIST_SKILLS

Lists all skills available to the team with their status.

**Parameters**: none

**Returns**:

```json
{
  "skills": [
    {
      "slug": "copywriter",
      "name": "Campaign Copywriter",
      "description": "Generates on-brand copy for all channels",
      "category": "campaign",
      "status": "active",
      "requires_connections": [],
      "dependencies": ["brand-dna"]
    }
  ]
}
```

### SNEW_GET_SKILL

Gets full details of a specific skill.

**Parameters**:

```json
{
  "skill_slug": "string (required)"
}
```

**Returns**:

```json
{
  "slug": "copywriter",
  "name": "Campaign Copywriter",
  "description": "...",
  "category": "campaign",
  "status": "active",
  "dependencies": ["brand-dna"],
  "requires_connections": [],
  "last_execution": {
    "created_at": "2026-03-23T10:00:00Z",
    "status": "completed",
    "duration_ms": 3200
  }
}
```

### SNEW_RUN_SKILL

Executes a skill with input data. Creates a `skill_executions` record.

**Parameters**:

```json
{
  "skill_slug": "string (required)",
  "input": "object (optional — skill-specific input data)"
}
```

**Returns**:

```json
{
  "execution_id": "uuid",
  "status": "completed",
  "output": { "...skill-specific structured output..." },
  "duration_ms": 3200
}
```

**Error cases**:

- Skill not found → `{ "error": "Skill 'xyz' not found" }`
- Skill not active → `{ "error": "Skill 'xyz' is not active. Activate it first." }`
- Missing dependency → `{ "error": "Skill 'xyz' requires 'brand-dna' to be active" }`
- Missing connection → `{ "error": "Skill 'xyz' requires Nuvemshop connection" }`

---

## Server Actions

### Skills CRUD

```typescript
// Fetch all skills for the team
fetchTeamSkills(teamId: string): Promise<Skill[]>

// Fetch a single skill by slug
fetchSkillBySlug(teamId: string, slug: string): Promise<Skill | null>

// Activate a skill (status: available → active)
activateSkill(teamId: string, slug: string): Promise<void>

// Deactivate a skill (status: active → available)
deactivateSkill(teamId: string, slug: string): Promise<void>

// Fetch recent executions for a skill
fetchSkillExecutions(skillId: string, limit?: number): Promise<SkillExecution[]>
```

### Skill Seeding

```typescript
// Seed skills from code registry for a team (called on team creation or migration)
seedTeamSkills(teamId: string): Promise<void>
```

---

## Client Hooks

### useSkills

Replaces `useAgents`. Fetches all skills for the current team.

```typescript
function useSkills(): {
  skills: Skill[]
  isLoading: boolean
  error: Error | null
  activeSkills: Skill[] // filtered by status === 'active'
  skillsByCategory: Record<string, Skill[]>
}
```

### useSkill

Replaces `useAgent`. Fetches a single skill by slug.

```typescript
function useSkill(slug: string): {
  skill: Skill | null
  isLoading: boolean
  executions: SkillExecution[]
}
```

### useChat (unified)

Replaces both `useAgentChat` and `useOrchestratorChat`. Single hook for all chat.

```typescript
function useChat(): {
  messages: Message[]
  sendMessage: (text: string) => void
  isStreaming: boolean
  conversationId: string | null
}
```
