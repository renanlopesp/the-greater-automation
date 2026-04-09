# Research: Agent Provisioning + Onboarding

**Date**: 2026-04-09

## Decision 1: Two-Phase vs Single-Phase Provisioning

**Decision**: Two-phase provisioning — generic agent at signup, personalized after brand DNA.

**Rationale**: Brand DNA analysis happens AFTER store connection and product sync, which requires user interaction. The agent needs to exist before brand DNA to help guide the onboarding process itself. Creating a generic agent first, then updating it, is simpler than deferring agent creation until brand DNA is ready.

**Alternatives considered**:

- Single-phase (wait for brand DNA): User would have no AI assistant during onboarding — worse UX.
- Create two separate agents (onboarding + permanent): Wastes resources, requires agent switching logic, confusing.

## Decision 2: Prompt Mode Architecture

**Decision**: Add a `mode` parameter to `buildOrchestratorSystemPrompt()` with values `'onboarding'` | `'full'`.

**Rationale**: The existing function already accepts optional brand DNA and store context. Adding a mode parameter lets us explicitly control which prompt sections are included. In onboarding mode, we include setup guidance and omit brand-specific sections. In full mode, we include everything (current behavior).

**Alternatives considered**:

- Two separate prompt builder functions: Code duplication for shared sections (tools, personality base).
- Infer mode from presence of brand DNA: Fragile — a team with no brand DNA in full mode should still work (graceful degradation).

## Decision 3: Agent Update Mechanism

**Decision**: Use `PATCH /v1/agents/{id}` via the Anthropic SDK to update the system prompt.

**Rationale**: The Managed Agents API supports updating an agent's configuration (system prompt, model, tools) via PATCH. This is simpler than deleting and recreating the agent, and preserves the agent ID in the team record.

**Alternatives considered**:

- Delete + recreate agent: Loses session history, generates new ID, requires updating team record.
- Store prompt locally and inject per-session: Defeats the purpose of Managed Agents — the prompt should live on the agent.

## Decision 4: Model Selection Strategy

**Decision**: Check Stripe subscription at provisioning time. Free plan → claude-sonnet-4-6. Pro plan → claude-opus-4-6. Model can be updated when plan changes.

**Rationale**: The team's plan is already available via the billing system. Selecting the model at provisioning is the simplest approach. When a user upgrades, the update-prompt endpoint can also update the model.

**Alternatives considered**:

- Per-session model selection: More flexible but adds complexity. The user already has a model selector in the UI — this could be a future enhancement.
- Always use Sonnet, upgrade to Opus per-message: Complicated billing, inconsistent experience.
