# API Routes Contract: Agent Provisioning

**Date**: 2026-04-09

## POST /api/agents/provision

Creates a Managed Agent for the authenticated user's team. Idempotent — returns existing agent if already provisioned.

**Auth**: Required (session cookie)

**Request**: No body required.

**Response (200 — already provisioned)**:

```json
{
  "agentId": "agent_011CZs...",
  "envId": "env_01C1hH..."
}
```

**Response (201 — newly provisioned)**:

```json
{
  "agentId": "agent_011CZs...",
  "envId": "env_01C1hH...",
  "created": true
}
```

**Response (401)**:

```json
{ "error": "Unauthorized" }
```

**Response (400)**:

```json
{ "error": "No team found" }
```

**Response (500)**:

```json
{ "error": "Failed to provision agent" }
```

**Behavior**:

1. Check auth + team membership
2. If team already has agent_id + env_id → return them (200)
3. Generate system prompt in "onboarding" mode
4. Determine model from subscription plan (sonnet for free, opus for pro)
5. Create agent via Anthropic API
6. Create environment via Anthropic API
7. Save both IDs to teams table
8. Return new IDs (201)

---

## POST /api/agents/update-prompt

Updates the agent's system prompt after brand DNA is available. Also supports model upgrades.

**Auth**: Required (session cookie)

**Request body (optional)**:

```json
{
  "model": "claude-opus-4-6"
}
```

**Response (200)**:

```json
{
  "success": true,
  "agentId": "agent_011CZs...",
  "mode": "full"
}
```

**Response (400 — no agent provisioned)**:

```json
{ "error": "Team has no provisioned agent. Call /api/agents/provision first." }
```

**Response (500)**:

```json
{ "error": "Failed to update agent prompt" }
```

**Behavior**:

1. Check auth + team membership
2. If team has no agent_id → return 400
3. Fetch brand DNA, store info, skills for the team
4. Generate system prompt in "full" mode (with brand DNA if available, graceful degradation if not)
5. PATCH agent via Anthropic API with new system prompt (and model if provided)
6. Return success
