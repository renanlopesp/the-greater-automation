# Feature Specification: Structured Skills & Terminology Alignment

**Feature Branch**: `020-structured-skills`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "Skills & Workflows Terminology Alignment + Structured Skills — align terminology with Codex skills standard, restructure skills as structured markdown documents with support for executable procedures"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agent Creates Knowledge Skill via Chat (Priority: P1)

A user chats with their agent and asks it to learn something new (e.g., "learn our deployment process"). The agent creates a **structured skill** of type `knowledge` following a standardized template with sections: Description, When to Use, Instructions, Examples, and Constraints. The skill is stored as structured markdown and appears in the Skills tab with collapsible sections.

**Why this priority**: This is the core value proposition — skills must be structured documents, not loose text blobs. Without this, the agent cannot reliably follow learned knowledge.

**Independent Test**: Can be tested by chatting with an agent, asking it to create a skill, and verifying the resulting skill follows the structured template with all applicable sections.

**Acceptance Scenarios**:

1. **Given** a user is chatting with their agent, **When** they ask the agent to "learn our deploy process: always run tests first, then build, then deploy to staging, then production", **Then** the agent creates a knowledge skill with structured sections (Description, Instructions, Constraints at minimum) and the skill appears in the Skills tab with type indicator "Knowledge".
2. **Given** the agent is creating a skill, **When** the user provides information that maps to multiple sections (instructions + examples + constraints), **Then** the agent populates each relevant section separately instead of dumping everything into a single content block.
3. **Given** a structured skill exists, **When** the user views it in the Skills tab, **Then** they see the skill name, type badge, description summary, and can expand to see the full structured content with labeled sections.

---

### User Story 2 - Agent Creates Procedure Skill via Chat (Priority: P1)

A user asks the agent to automate a multi-step process (e.g., "create a skill to deploy: create PR, wait for CI, merge, notify on Slack"). The agent creates a **procedure skill** — a reusable, executable sequence of steps with defined parameters. Unlike workflows (which are trigger-based automations), procedure skills are callable subprograms the agent invokes on demand during a conversation.

**Why this priority**: Procedure skills are what differentiate a truly capable agent from a knowledge base. The agent can actually DO things, not just know things. This is the "scripts/" equivalent from Codex's skill model.

**Independent Test**: Can be tested by creating a procedure skill, then asking the agent to execute it with specific parameters, and verifying each step runs in sequence.

**Acceptance Scenarios**:

1. **Given** a user asks "create a skill to deploy my app", **When** the agent creates the skill, **Then** it creates a procedure skill with defined steps (each step references a tool/action), parameters (branch, environment), and the skill appears with type indicator "Procedure".
2. **Given** a procedure skill "Deploy App" exists with parameters `branch` and `environment`, **When** the user says "deploy main to staging", **Then** the agent loads the procedure, maps the parameters, and executes each step in sequence using the defined tools.
3. **Given** a procedure skill is executing step 3 of 5, **When** step 3 fails (e.g., CI check failed), **Then** the agent reports the failure, shows which step failed and why, and asks whether to retry, skip, or abort.
4. **Given** a procedure skill has an `approval_required` flag on a step, **When** execution reaches that step, **Then** the agent pauses and asks the user for confirmation before proceeding.

---

### User Story 3 - Database Terminology Alignment (Priority: P1)

The database tables are renamed to reflect their actual purpose: automation rules become "workflows" and knowledge/instruction packages become "skills". All dependent code (components, actions, hooks, types, tools) is updated to use consistent terminology.

**Why this priority**: Terminology confusion causes developer friction and makes the codebase harder to maintain. This is foundational — all other stories depend on correct naming.

**Independent Test**: Can be tested by running the full test suite after migrations and verifying all CRUD operations work correctly with the new table names.

**Acceptance Scenarios**:

1. **Given** the current `agent_skills` table stores automation rules, **When** the migration runs, **Then** the table is renamed to `agent_workflows` with all foreign keys, indexes, and RLS policies updated.
2. **Given** the current `agent_knowledge_skills` table stores knowledge, **When** the migration runs, **Then** the table is renamed to `agent_skills` with new columns for skill type, version, metadata, and parameters.
3. **Given** the current `agent_skill_runs` table tracks execution history, **When** the migration runs, **Then** the table is renamed to `agent_workflow_runs` with all references updated.
4. **Given** the migration has run, **When** any existing feature (chat, sidebar, workflow execution, webhook triggers) is used, **Then** it works identically to before — zero user-facing regressions.

---

### User Story 4 - Progressive Disclosure in Agent Context (Priority: P2)

The agent's system prompt includes only skill names, types, and descriptions (lightweight metadata). When the agent decides a skill is relevant to the current conversation, it loads the full structured content on demand via a dedicated tool call. This keeps the system prompt small and focused.

**Why this priority**: Without progressive disclosure, all skill content is injected into every conversation, wasting tokens and diluting the agent's focus. This is important for agents with many skills.

**Independent Test**: Can be tested by creating multiple skills, chatting with the agent, and verifying (via logs) that only metadata appears in the system prompt and full content is loaded only when the agent calls the retrieval tool.

**Acceptance Scenarios**:

1. **Given** an agent has 5 enabled skills (mix of knowledge and procedure), **When** a new chat starts, **Then** the system prompt contains only skill names, types, and descriptions (not full content or step definitions), keeping the prompt lightweight.
2. **Given** the agent is in a conversation about deployment, **When** it determines the "Deploy App" procedure skill is relevant, **Then** it calls `SNEW_GET_SKILL_CONTENT` to load the full procedure definition including steps and parameters.
3. **Given** the agent is in a conversation unrelated to any skill, **When** it processes the user's message, **Then** no skill content is loaded beyond the metadata already in the system prompt.

---

### User Story 5 - Skill Template for Consistent Structure (Priority: P2)

When the agent creates a skill (via `SNEW_CREATE_SKILL`), it follows a standardized markdown template based on the skill type. Knowledge skills have sections for instructions, examples, and constraints. Procedure skills have sections for parameters, steps, and error handling. The template ensures consistency and machine-readability.

**Why this priority**: Without a template, skills degrade back to unstructured text. The template ensures consistency and makes skills parseable for progressive disclosure and execution.

**Independent Test**: Can be tested by asking the agent to create skills of different types and verifying each follows the appropriate template structure.

**Acceptance Scenarios**:

1. **Given** the agent is creating a knowledge skill, **When** it calls `SNEW_CREATE_SKILL` with type `knowledge`, **Then** the content field contains structured markdown with at least `## Description` and `## Instructions` sections.
2. **Given** the agent is creating a procedure skill, **When** it calls `SNEW_CREATE_SKILL` with type `procedure`, **Then** the content field contains structured markdown with `## Parameters`, `## Steps`, and optionally `## Error Handling` sections.
3. **Given** the user provides examples ("when someone says X, respond with Y"), **When** the agent creates the skill, **Then** the skill includes a `## Examples` section with the input/output pairs formatted consistently.
4. **Given** the user specifies constraints ("never do X", "always use formal tone"), **When** the agent creates the skill, **Then** the skill includes a `## Constraints` section listing the rules.

---

### User Story 6 - Agent Executes Procedure Skill (Priority: P2)

When a user asks the agent to perform a task that matches a procedure skill, the agent loads the procedure, resolves parameters from the conversation context, and executes each step sequentially. The agent reports progress and handles errors at each step.

**Why this priority**: Procedure skills are only valuable if they can be executed. This story delivers the execution engine that makes procedure skills actionable.

**Independent Test**: Can be tested by creating a procedure skill with 3 steps, executing it via chat, and verifying each step runs and the agent reports results.

**Acceptance Scenarios**:

1. **Given** a procedure skill "Create GitHub Issue" exists with parameters `title`, `body`, `repo`, **When** the user says "create an issue about the login bug in our main repo", **Then** the agent maps parameters from context, executes the Composio action, and reports the result.
2. **Given** a procedure skill has 4 steps, **When** the agent executes it, **Then** the user sees progress updates for each step ("Step 1/4: Creating PR... done", "Step 2/4: Waiting for CI...").
3. **Given** a procedure has a step that produces output (e.g., a PR URL), **When** subsequent steps reference that output, **Then** the agent correctly passes the output as input to the next step using template variables.

---

### User Story 7 - UI Renders Structured Skill Sections (Priority: P3)

The Skills tab in the agent sidebar renders structured skills with type badges and collapsible sections. Knowledge skills show instruction sections. Procedure skills show parameter definitions and step lists. Users can expand/collapse sections to review skill content.

**Why this priority**: The structured content is only useful if users can navigate it. Collapsible sections prevent information overload while maintaining access to all details.

**Independent Test**: Can be tested by creating skills of both types and verifying each renders with appropriate type badge and collapsible sections.

**Acceptance Scenarios**:

1. **Given** a knowledge skill with 4 sections exists, **When** the user views it in the Skills tab, **Then** they see the skill name, "Knowledge" badge, description, and collapsible section headers.
2. **Given** a procedure skill exists, **When** the user views it in the Skills tab, **Then** they see the skill name, "Procedure" badge, parameter list, and numbered steps.
3. **Given** a skill card is displayed, **When** the user clicks a section header, **Then** that section expands to show its content while other sections remain in their current state.
4. **Given** a skill has no Examples section, **When** it is displayed, **Then** only the sections that exist are shown — no empty section placeholders.

---

### User Story 8 - Code Terminology Alignment (Priority: P1)

All source code (components, hooks, server actions, API routes, types, variable names) is updated to use consistent terminology: "workflows" for automations and "skills" for knowledge/procedure packages. Component files are renamed accordingly.

**Why this priority**: Code that contradicts its own naming (e.g., `SkillsList` showing workflows) creates confusion for developers and increases maintenance cost.

**Independent Test**: Can be tested by searching the codebase for misaligned terminology and verifying all component/file names match what they display.

**Acceptance Scenarios**:

1. **Given** the current `SkillsList` component renders automations, **When** the rename is complete, **Then** it is renamed to `WorkflowsList` and all imports are updated.
2. **Given** the current `KnowledgeSkillsList` component renders knowledge skills, **When** the rename is complete, **Then** it is renamed to `SkillsList` and all imports are updated.
3. **Given** the rename is complete, **When** a developer searches for "skill" in the codebase, **Then** all matches relate to knowledge/procedure skills — not to workflow automations.

---

### Edge Cases

- What happens when a skill's content doesn't follow the template structure? The system gracefully renders unstructured content as a single block (backward compatibility with existing skills).
- What happens during migration if there are active workflow executions referencing old table names? The migration uses `ALTER TABLE RENAME` which preserves data and updates references atomically.
- What happens if the agent creates a skill with only a Description section and no Instructions? The skill is valid — not all sections are mandatory. Only name, type, and description are required.
- What happens when progressive disclosure loads a skill that was disabled between the system prompt generation and the tool call? The tool returns the content but includes an `is_enabled: false` flag so the agent can decide whether to use it.
- What happens when a procedure skill references a Composio action that is no longer available (e.g., app disconnected)? The execution engine reports the failure at the specific step, explains the missing dependency, and asks the user to reconnect the app or skip the step.
- What happens when a procedure skill step requires user input at runtime (e.g., "which branch?")? Steps can be marked `requires_input: true`, causing the agent to ask the user for the value before proceeding.
- What happens if the user asks the agent to run a knowledge skill? The agent explains that knowledge skills provide guidance but aren't executable — it uses the skill's instructions to inform its response instead.

## Requirements _(mandatory)_

### Functional Requirements

**Database & Terminology**

- **FR-001**: System MUST rename `agent_skills` table to `agent_workflows` via a reversible migration, preserving all data, foreign keys, indexes, and RLS policies.
- **FR-002**: System MUST rename `agent_knowledge_skills` table to `agent_skills` via a reversible migration, adding columns: `type` (text, default 'knowledge'), `version` (integer, default 1), `metadata` (JSONB, default {}), `parameters` (JSONB, default null).
- **FR-003**: System MUST rename `agent_skill_runs` table to `agent_workflow_runs` via a reversible migration, updating all foreign key references.
- **FR-004**: All source code references (components, hooks, actions, types, variable names) MUST use "workflow" for automations and "skill" for knowledge/procedure packages.

**Skill Types**

- **FR-005**: Skills MUST have a `type` field with values: `knowledge` (default) or `procedure`.
- **FR-006**: Knowledge skills MUST store structured markdown content following a template with section headers: `## Description`, `## When to Use`, `## Instructions`, `## Examples`, `## Constraints`, `## References` (not all required).
- **FR-007**: Procedure skills MUST store structured markdown content following a template with section headers: `## Description`, `## Parameters`, `## Steps`, `## Error Handling` (not all required).
- **FR-008**: Procedure skill steps MUST define: step number, description, tool/action to call, parameter mapping (from skill parameters, previous step outputs, or user input), and optional `approval_required` flag.
- **FR-009**: Procedure skill parameters MUST define: name, type (string, number, boolean, enum), required/optional, default value, and description.

**Progressive Disclosure**

- **FR-010**: The agent system prompt MUST include only skill name, type, and description for each enabled skill — not full content or step definitions.
- **FR-011**: System MUST provide a `SNEW_GET_SKILL_CONTENT` tool that loads the full structured content of a specific skill by ID or name.

**Skill Creation & Execution**

- **FR-012**: The `SNEW_CREATE_SKILL` tool MUST accept a `type` parameter (`knowledge` or `procedure`) and instruct the agent to format content using the appropriate template.
- **FR-013**: The `SNEW_CREATE_SKILL` tool MUST accept a `parameters` field (JSONB) for procedure skills, defining the callable parameters of the skill.
- **FR-014**: System MUST provide a `SNEW_EXECUTE_SKILL` tool that executes procedure skills by: loading the procedure, resolving parameters, and running each step sequentially with progress reporting.
- **FR-015**: Procedure skill execution MUST support parameter resolution from: conversation context, explicit user input, previous step outputs (via `{{prev.field}}` template syntax), and static defaults.
- **FR-016**: Procedure skill execution MUST handle step failures gracefully — report which step failed, show the error, and offer retry/skip/abort options.

**UI**

- **FR-017**: The Skills tab UI MUST render structured skill content with collapsible sections for each markdown heading.
- **FR-018**: The Skills tab MUST display a type badge ("Knowledge" or "Procedure") for each skill.
- **FR-019**: Procedure skills MUST display their parameter list and step count in the collapsed view.
- **FR-020**: Existing unstructured skills MUST render gracefully as a single content block without section headers.

### Key Entities

- **Skill** (`agent_skills` — renamed from `agent_knowledge_skills`): A structured capability package that extends agent behavior. Has two types:
  - **Knowledge**: Instructions, guidelines, and reference information the agent uses to inform responses. Key attributes: name, description, content (structured markdown with sections), version, is_enabled, metadata.
  - **Procedure**: A reusable executable subprogram the agent can run on demand. Key attributes: name, description, content (structured markdown with steps), parameters (JSONB defining callable inputs), version, is_enabled, metadata.
- **Workflow** (`agent_workflows` — renamed from `agent_skills`): A trigger-based automation rule following WHEN (trigger) → IF (conditions) → THEN (actions) pattern. Runs automatically or on schedule — not invoked by the agent during conversation. Key attributes: name, trigger_config, conditions, actions, execution_mode, is_enabled.
- **Workflow Run** (`agent_workflow_runs` — renamed from `agent_skill_runs`): Execution history for a workflow. Key attributes: workflow_id, status, trigger_data, result, executed_at.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All skills created via agent chat follow the structured template (knowledge or procedure) with at least 2 sections in 90% of cases.
- **SC-002**: Agent system prompt size reduces by at least 50% for agents with 3+ skills compared to the current full-content injection approach.
- **SC-003**: Zero regressions in existing functionality — all existing workflows continue to execute correctly, all existing skills remain accessible.
- **SC-004**: Developers can identify whether a piece of code relates to "skills" (knowledge/procedure) or "workflows" (automations) purely from naming conventions, without reading implementation details.
- **SC-005**: Users can view and navigate structured skill content in the UI without scrolling through a wall of text.
- **SC-006**: Procedure skills can be executed end-to-end via agent chat, with the agent correctly resolving parameters and reporting per-step progress.

## Assumptions

- The migration can be performed with zero downtime since `ALTER TABLE RENAME` in PostgreSQL is a metadata-only operation.
- Existing unstructured skill content (from `agent_knowledge_skills`) will be preserved as-is with type `knowledge` and rendered as a single block until the user or agent edits them.
- The structured template is a convention enforced by the agent's tool description, not a database schema constraint — the `content` column remains a text field.
- Skill versioning is simple integer increment, not semantic versioning — sufficient for tracking changes.
- Procedure skill execution reuses existing Composio tool infrastructure — steps call the same tools available in the agent chat. No new execution runtime is needed.
- Procedure skills execute within a single conversation turn (or multi-step tool loop). Long-running procedures that span hours/days are out of scope — those remain as workflows with triggers.
