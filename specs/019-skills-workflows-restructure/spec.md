# Feature Specification: Skills vs Workflows Restructure

**Feature Branch**: `019-skills-workflows-restructure`
**Created**: 2026-02-14
**Status**: Draft
**Input**: Separate "skills" (embedded agent knowledge/capabilities) from "workflows" (WHEN→IF→THEN automations). The current system conflates both under "skills".

## Context

Currently, when the LLM creates a "skill" via SNEW_CREATE_SKILL, it actually creates a full automation pipeline (trigger → conditions → actions) — this is a **workflow**, not a skill. True skills should be lightweight embedded knowledge/capabilities that the agent uses contextually during conversations.

### Current State (What's Wrong)

- `agent_skills` table stores both workflow-automations AND skill metadata
- SNEW_CREATE_SKILL creates a workflow + trigger + steps AND an agent_skill record
- The UI shows everything under "Skills" with no distinction
- No concept of "embedded knowledge" skills exists

### Target State

- **Workflows**: Automations with WHEN→IF→THEN pattern (trigger, conditions, actions). Created via chat or editor.
- **Skills**: Embedded knowledge/capabilities. Created via conversation. Added/removed from agent. Used contextually.
- **Separate UI**: Two distinct sections in the agent detail page for managing each.

## User Scenarios & Testing

### User Story 1 - Agent Workflows Tab (Priority: P1)

As a user, I want to see my agent's automations (workflows) in a dedicated "Workflows" tab so I can manage them separately from skills.

**Why this priority**: This is the foundational UI separation. Without it, the conceptual distinction has no user-facing impact.

**Independent Test**: Navigate to agent detail → see "Workflows" tab → view all WHEN→IF→THEN automations created by the agent.

**Acceptance Scenarios**:

1. **Given** an agent with rule-based automations, **When** I open the agent detail page, **Then** I see a "Workflows" tab listing all automations with trigger type, status, and last run.
2. **Given** the Workflows tab is open, **When** I click a workflow, **Then** I see its trigger config, conditions, actions, and run history.
3. **Given** the Workflows tab, **When** I toggle an automation on/off, **Then** it enables/disables the automation.
4. **Given** the Workflows tab, **When** I delete a workflow, **Then** it removes the automation and its associated workflow record.

---

### User Story 2 - Agent Skills Tab (Priority: P1)

As a user, I want a dedicated "Skills" tab where I can see, add, and remove embedded knowledge/capabilities for my agent.

**Why this priority**: This establishes the new skill concept and gives users control over agent capabilities.

**Independent Test**: Navigate to agent detail → "Skills" tab → see list of skills → add/remove skills.

**Acceptance Scenarios**:

1. **Given** an agent with skills, **When** I open the Skills tab, **Then** I see a list of skills with name, description, and source (chat/manual).
2. **Given** the Skills tab, **When** I click "Add Skill", **Then** I can create a new skill with name, description, and instruction content.
3. **Given** a skill exists, **When** I click remove, **Then** the skill is deleted and the agent no longer uses it.
4. **Given** a skill exists, **When** I chat with the agent, **Then** the agent's behavior reflects the skill's instructions when relevant.

---

### User Story 3 - LLM Creates Workflows via Chat (Priority: P1)

As a user, when I ask the agent to create an automation in chat, it should be saved as a "workflow" (not a "skill") and appear in the Workflows tab.

**Why this priority**: The LLM tool naming and behavior must match the new concepts.

**Independent Test**: Chat with agent → ask to create an automation → verify it appears in Workflows tab (not Skills tab).

**Acceptance Scenarios**:

1. **Given** I'm chatting with an agent, **When** I ask "create an automation that labels new GitHub issues", **Then** the agent uses a workflow creation tool (not SNEW_CREATE_SKILL).
2. **Given** a workflow was created via chat, **When** I open the Workflows tab, **Then** I see the new workflow listed.
3. **Given** a workflow was created via chat, **When** I open the workflow editor, **Then** I can edit it like any other workflow.

---

### User Story 4 - LLM Creates Skills via Chat (Priority: P2)

As a user, when I teach the agent something new in chat (e.g., "when someone asks about deploy, follow this process..."), it should be saved as a skill.

**Why this priority**: Enables the core value of skills as embedded knowledge, but depends on the UI structure from P1 stories.

**Independent Test**: Chat with agent → teach it a skill → verify it appears in Skills tab → verify agent uses it.

**Acceptance Scenarios**:

1. **Given** I'm chatting with an agent, **When** I say "remember: always greet users in Portuguese", **Then** the agent creates a skill and confirms.
2. **Given** a skill was created, **When** I check the Skills tab, **Then** the new skill appears with its instruction content.
3. **Given** the skill exists, **When** I chat with the agent again, **Then** the agent follows the skill's instruction when relevant.

---

### User Story 5 - Rename SNEW Tools to Workflow Tools (Priority: P1)

As a developer, the LLM tools should reflect the new naming: SNEW_CREATE_SKILL → workflow creation tools.

**Why this priority**: Internal consistency is critical for the LLM to behave correctly.

**Independent Test**: Verify tool names in skill-builder-tools.ts match new naming. Verify system prompt references workflows for automations.

**Acceptance Scenarios**:

1. **Given** the tool definitions, **When** the LLM lists available tools, **Then** automation tools are named with "WORKFLOW" prefix (e.g., WORKFLOW_CREATE, WORKFLOW_LIST).
2. **Given** the system prompt, **When** it describes automation capabilities, **Then** it uses "workflow" terminology (not "skill").
3. **Given** the new skill tools, **When** the LLM lists skill tools, **Then** they are named with "SKILL" prefix (e.g., SKILL_CREATE, SKILL_LIST, SKILL_DELETE).

---

### Edge Cases

- What happens to existing `agent_skills` records with `source='rule'`? → Migrate to workflow concept.
- What happens to existing `agent_skills` with `source='manual'` or `source='dynamic'`? → Keep as legacy skills or migrate to new skill format.
- What if a user creates a skill and a workflow with the same name? → Allow it, they're different entities.
- What happens to webhook endpoints? → Unchanged, webhooks are workflow triggers.
- What about the `agent_skills.workflow_id` FK? → Rule-based records become workflow references; skill records have no workflow_id.

## Requirements

### Functional Requirements

- **FR-001**: System MUST separate agent automations (workflows) from agent skills (embedded knowledge) in the database.
- **FR-002**: Agent detail page MUST have separate tabs for "Workflows" and "Skills".
- **FR-003**: LLM tools MUST be renamed: automation tools use WORKFLOW* prefix, knowledge tools use SKILL* prefix.
- **FR-004**: System MUST support creating skills via chat (name, description, instruction content).
- **FR-005**: Skills MUST be injected into the agent's system prompt when chatting.
- **FR-006**: Existing rule-based `agent_skills` records MUST be migrated to the new workflow concept.
- **FR-007**: Workflow creation via chat MUST continue to work (trigger, conditions, actions pipeline).
- **FR-008**: Skills tab MUST support add, edit, remove operations.
- **FR-009**: Workflows tab MUST support view, toggle enable/disable, delete, and link to workflow editor.
- **FR-010**: System MUST maintain backward compatibility with existing webhook endpoints and cron jobs.

### Key Entities

- **Agent Skill** (new concept): Embedded knowledge/capability. Fields: name, description, content (instruction text), source (chat/manual), is_enabled.
- **Agent Workflow** (renamed from rule-based skills): WHEN→IF→THEN automation. Reuses existing `workflows` + `workflow_triggers` + `workflow_steps` tables. Linked to agent via a join table or FK.
- **Agent**: Has many skills (knowledge) and many workflows (automations).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Agent detail page shows separate "Workflows" and "Skills" tabs.
- **SC-002**: Creating an automation via chat results in a workflow (not a skill) appearing in the Workflows tab.
- **SC-003**: Creating a skill via chat results in a skill appearing in the Skills tab.
- **SC-004**: Skills are injected into agent system prompt and influence agent behavior.
- **SC-005**: All existing automations continue to work (webhooks, cron, manual execution).
- **SC-006**: Unit tests cover skill CRUD, workflow CRUD, system prompt injection.
- **SC-007**: E2E Playwright tests verify both tabs, creation flows, and execution.
