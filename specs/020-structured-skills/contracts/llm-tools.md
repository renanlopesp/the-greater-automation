# LLM Tool Contracts: Skills

Tools available to the agent for managing skills (knowledge + procedure).

## SNEW_CREATE_SKILL

Creates a new skill for the agent.

**Parameters**:

```json
{
  "name": "string (required) — Skill name",
  "description": "string (required) — Short description for progressive disclosure",
  "type": "string (required) — 'knowledge' or 'procedure'",
  "content": "string (required) — Structured markdown following type-specific template",
  "parameters": "object (optional) — Parameter definitions for procedure skills"
}
```

**Returns**:

```json
{
  "success": true,
  "skill": { "id": "uuid", "name": "string", "type": "string" }
}
```

**Agent instruction** (in tool description): Content MUST follow the structured template. For knowledge skills: include ## Description, ## Instructions, and optionally ## Examples, ## Constraints, ## References. For procedure skills: include ## Description, ## Parameters, ## Steps, and optionally ## Error Handling.

## SNEW_GET_SKILL_CONTENT

Loads the full structured content of a skill by ID or name. Used for progressive disclosure — agent calls this when a skill is relevant to the current conversation.

**Parameters**:

```json
{
  "skill_id": "string (optional) — Skill UUID",
  "skill_name": "string (optional) — Skill name (fuzzy match)"
}
```

**Returns**:

```json
{
  "skill": {
    "id": "uuid",
    "name": "string",
    "type": "knowledge|procedure",
    "description": "string",
    "content": "string (full structured markdown)",
    "parameters": "object|null",
    "is_enabled": "boolean",
    "version": "number"
  }
}
```

## SNEW_LIST_SKILLS

Lists all skills for the agent (metadata only, no full content).

**Parameters**: none

**Returns**:

```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "string",
      "type": "knowledge|procedure",
      "description": "string",
      "is_enabled": "boolean",
      "version": "number"
    }
  ]
}
```

## SNEW_UPDATE_SKILL

Updates an existing skill's content, parameters, or metadata.

**Parameters**:

```json
{
  "skill_id": "string (required)",
  "name": "string (optional)",
  "description": "string (optional)",
  "content": "string (optional)",
  "parameters": "object (optional)",
  "is_enabled": "boolean (optional)"
}
```

**Returns**:

```json
{
  "success": true,
  "skill": { "id": "uuid", "name": "string", "version": "number" }
}
```

Note: Version auto-increments when content or parameters change.

## SNEW_DELETE_SKILL

Deletes a skill.

**Parameters**:

```json
{
  "skill_id": "string (required)"
}
```

**Returns**:

```json
{
  "success": true
}
```

## SNEW_EXECUTE_SKILL

Executes a procedure skill. Only works for type='procedure' skills.

**Parameters**:

```json
{
  "skill_id": "string (required)",
  "params": "object (required) — Parameter values matching the skill's parameter definitions"
}
```

**Returns**:

```json
{
  "success": true,
  "results": [
    { "step": 1, "description": "string", "status": "completed", "output": {} },
    { "step": 2, "description": "string", "status": "completed", "output": {} }
  ]
}
```

**Error case**:

```json
{
  "success": false,
  "error": "Step 3 failed: GITHUB_MERGE_PULL_REQUEST returned 409 Conflict",
  "completed_steps": 2,
  "total_steps": 4,
  "options": ["retry", "skip", "abort"]
}
```
