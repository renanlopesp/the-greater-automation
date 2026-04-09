# Quickstart: Agent Provisioning

## Prerequisites

- Anthropic API key with Managed Agents beta access
- Supabase project with teams table (migration applied)
- A registered user with team membership

## Provision a New Agent

```bash
# 1. Login and get session cookie
# (done automatically in the frontend)

# 2. Call provision endpoint
curl -X POST http://localhost:3000/api/agents/provision \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Response:
# { "agentId": "agent_...", "envId": "env_...", "created": true }
```

## Update Agent After Brand DNA

```bash
# After brand DNA analysis completes:
curl -X POST http://localhost:3000/api/agents/update-prompt \
  -H "Cookie: sb-access-token=..." \
  -H "Content-Type: application/json"

# Response:
# { "success": true, "agentId": "agent_...", "mode": "full" }
```

## Verify Agent Works

```bash
# Send a test message via Anthropic API
curl https://api.anthropic.com/v1/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent_...",
    "environment_id": "env_..."
  }'
```

## Verify Two Modes

1. **Before brand DNA**: Provision agent → send "como conectar minha loja?" → agent should respond with setup guidance
2. **After brand DNA**: Update prompt → send "qual o tom da minha marca?" → agent should respond with brand-specific tone information
