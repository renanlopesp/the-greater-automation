# Feature Specification: Agent Provisioning + Onboarding

**Feature Branch**: `059-agent-provisioning`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-B from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — New Customer Gets a Personal AI Agent (Priority: P1)

When a new customer signs up and connects their store, the system automatically creates a dedicated AI agent for their business. This agent starts as a generic onboarding assistant that helps the customer through the setup process — connecting their store, analyzing their brand, and configuring initial skills.

**Why this priority**: Without agent provisioning, there is no Managed Agent for the customer to chat with. This is the prerequisite for the entire chat experience.

**Independent Test**: Sign up a new user, verify an AI agent is created and stored in the team record. Send a test message to the agent and receive a response.

**Acceptance Scenarios**:

1. **Given** a new user who just completed signup, **When** the system provisions their workspace, **Then** a dedicated AI agent is created with an onboarding-focused personality and the agent identifier is saved to the team record.
2. **Given** a team that already has a provisioned agent, **When** provisioning is requested again, **Then** the existing agent is returned without creating a duplicate (idempotent).
3. **Given** a provisioning request, **When** the external AI service is unavailable, **Then** the system returns a clear error message and the user can retry later.

---

### User Story 2 — Agent Evolves After Brand Analysis (Priority: P1)

After the customer completes onboarding and their brand DNA is analyzed (niche, audience, tone, palette, opportunities), the agent's personality is updated to reflect the brand. The agent now speaks in the brand's tone, knows the products, and provides advice tailored to the specific business.

**Why this priority**: The personalized agent is the core value proposition — a generic assistant is far less useful than one that understands the customer's brand.

**Independent Test**: Complete brand DNA analysis for a team that has a provisioned agent. Verify the agent's personality is updated. Send a message and confirm the response reflects the brand's tone and context.

**Acceptance Scenarios**:

1. **Given** a team with a provisioned agent and completed brand DNA, **When** the brand analysis finishes, **Then** the agent's personality is updated to include brand-specific language, tone, and knowledge.
2. **Given** an agent update request with brand DNA data, **When** the update succeeds, **Then** subsequent conversations use the new personalized personality.
3. **Given** an agent update request, **When** the brand DNA is incomplete (missing critical fields), **Then** the system uses reasonable defaults for missing fields and still updates the agent.

---

### User Story 3 — Agent Personality Has Two Modes (Priority: P1)

The system prompt generator supports two distinct modes: an "onboarding" mode for new customers going through setup, and a "full" mode for customers with complete brand DNA. The onboarding mode guides users through connecting their store, analyzing their brand, and configuring skills. The full mode includes all brand knowledge, retail tools, and marketing capabilities.

**Why this priority**: The two-mode system prompt is the architectural foundation that enables the two-phase provisioning. Without it, the agent can't transition from generic to personalized.

**Independent Test**: Generate a system prompt in "onboarding" mode — verify it contains setup guidance and no brand-specific content. Generate one in "full" mode with brand DNA — verify it includes brand tone, palette, and product knowledge.

**Acceptance Scenarios**:

1. **Given** mode is "onboarding", **When** the system prompt is generated, **Then** it includes onboarding guidance (connect store, analyze brand) and does NOT include brand-specific language.
2. **Given** mode is "full" with brand DNA provided, **When** the system prompt is generated, **Then** it includes brand tone, audience description, color palette, product knowledge, and full retail/marketing capabilities.
3. **Given** mode is "full" but brand DNA is partially complete, **When** the system prompt is generated, **Then** it uses available data and omits sections for missing data (graceful degradation).

---

### User Story 4 — Model Selection Per Customer Plan (Priority: P2)

Customers on the free plan get an agent powered by the standard model, while pro customers get access to the advanced model. The model selection is determined at provisioning time based on the customer's subscription plan.

**Why this priority**: Model differentiation is a monetization lever but not required for the core provisioning flow.

**Independent Test**: Provision an agent for a free-plan team, verify it uses the standard model. Provision for a pro-plan team, verify it uses the advanced model.

**Acceptance Scenarios**:

1. **Given** a team on the free plan, **When** the agent is provisioned, **Then** it uses the standard AI model.
2. **Given** a team on the pro plan, **When** the agent is provisioned, **Then** it uses the advanced AI model.
3. **Given** a team that upgrades from free to pro, **When** their agent is updated, **Then** the model is upgraded to the advanced tier.

---

### Edge Cases

- What happens when the team has no members? → Provisioning fails with a clear error.
- What happens when the external AI service rate-limits the request? → Retry with backoff, return error after 3 attempts.
- What happens when brand DNA is updated multiple times? → Each update overwrites the agent's personality with the latest brand DNA.
- What happens when a team is deleted? → The agent should be cleaned up (documented for 058-F cleanup spec).
- What happens when provisioning partially succeeds (agent created but environment fails)? → System retries environment creation. On repeated failure, stores the agent ID and flags the team for manual review.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST create a dedicated AI agent per team during the onboarding process
- **FR-002**: System MUST persist the agent identifier and environment identifier in the team record
- **FR-003**: Provisioning MUST be idempotent — requesting provisioning for an already-provisioned team returns the existing agent
- **FR-004**: The system prompt generator MUST support two modes: "onboarding" (generic setup guide) and "full" (personalized with brand DNA)
- **FR-005**: System MUST update the agent's personality when brand DNA analysis completes
- **FR-006**: The "onboarding" mode prompt MUST guide users through store connection, brand analysis, and skill configuration
- **FR-007**: The "full" mode prompt MUST include brand tone, audience, color palette, product context, and retail/marketing capabilities
- **FR-008**: System MUST select the AI model based on the team's subscription plan (standard for free, advanced for pro)
- **FR-009**: System MUST handle partial brand DNA gracefully — using available data and omitting sections for missing fields
- **FR-010**: The team record MUST be extended with fields for agent identifier and environment identifier
- **FR-011**: System MUST attach the MCP tools server (from 058-A) to the provisioned agent so it can access business tools

### Key Entities

- **Team**: Extended with agent identifier and environment identifier fields. Represents the customer's workspace.
- **Agent**: The AI assistant dedicated to a specific team. Has a personality (system prompt) that evolves from generic to brand-specific.
- **Brand DNA**: Analysis results (niche, audience, tone, palette, opportunities) that personalize the agent's behavior.
- **System Prompt**: The instruction set that defines the agent's personality, capabilities, and behavior — generated in two modes.

### Assumptions

- The MCP tools server (058-A) is already deployed and accessible before agent provisioning
- The external AI service supports creating agents with custom system prompts and attaching MCP servers
- The onboarding flow already handles store connection and brand DNA analysis — this spec only adds agent provisioning and prompt update hooks
- Subscription plan information is available in the team/billing records at provisioning time
- Brand DNA updates are infrequent (typically once during onboarding, occasionally when user re-runs analysis)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of new signups have a dedicated AI agent provisioned within 10 seconds of team creation
- **SC-002**: Agent personality update completes within 5 seconds after brand DNA analysis finishes
- **SC-003**: Provisioning is idempotent — repeated calls for the same team never create duplicate agents
- **SC-004**: The agent responds to onboarding questions correctly before brand DNA exists (e.g., "como conectar minha loja?")
- **SC-005**: After brand DNA update, the agent's responses reflect the brand's tone and context (verified by sending a test message)
- **SC-006**: Free-plan teams use the standard model; pro-plan teams use the advanced model — verified for all provisioned agents
