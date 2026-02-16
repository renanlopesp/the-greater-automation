# Feature Specification: Workflow AI Assistant

**Feature Branch**: `022-workflow-ai-assistant`
**Created**: 2026-02-16
**Status**: Draft
**Input**: User description: "Build AI assistant embedded in workflow editor with full context of triggers, runs, and steps. Must use real AI streaming, not hardcoded patterns."

## User Scenarios & Testing

### User Story 1 - AI-Powered Workflow Chat with Streaming (Priority: P1)

A user opens the workflow editor and sees the AI assistant panel on the left. They type a natural language description like "Create a workflow that monitors my GitHub PRs and sends a Slack summary every morning". The AI streams a response in real-time, understanding the full context of available trigger types (9 types), step types (8 types), and the current workflow state. The response includes both a conversational explanation and a structured workflow suggestion that can be applied to the editor.

**Why this priority**: This is the core value proposition - replacing the current hardcoded pattern-matching with real AI that understands the workflow domain. Without this, the assistant is essentially useless.

**Independent Test**: Can be fully tested by opening the workflow editor, typing a prompt, and verifying the AI streams a contextual response with workflow suggestions.

**Acceptance Scenarios**:

1. **Given** a user is on the workflow editor page with the assistant panel open, **When** they type "Build a daily email digest workflow" and press Enter, **Then** the AI streams a response explaining the workflow structure AND includes a `suggestedWorkflow` with a `scheduled` trigger and appropriate steps (AI, HTTP, etc.)
2. **Given** a workflow already has a webhook trigger and 2 steps configured, **When** the user asks "Add a step to validate the incoming data", **Then** the AI response references the existing trigger/steps by name and suggests a contextually appropriate new step
3. **Given** the user sends a message, **When** the AI is generating a response, **Then** the response streams token-by-token with a visible typing indicator, and the user can see partial text appearing in real-time

---

### User Story 2 - Apply Suggested Workflows to Editor (Priority: P1)

After the AI suggests a workflow (trigger + steps), the user can click "Apply to editor" to have the suggestion applied directly to the Zustand store, updating the trigger and adding steps. The AI uses valid trigger types and step types with properly structured configs matching the existing schemas.

**Why this priority**: Without the ability to apply suggestions, the AI is just a chatbot - the integration with the editor is what makes it a workflow builder.

**Independent Test**: Can be tested by getting an AI suggestion, clicking Apply, and verifying the editor canvas updates with the correct trigger and steps.

**Acceptance Scenarios**:

1. **Given** the AI has responded with a `suggestedWorkflow` containing a scheduled trigger and 3 steps, **When** the user clicks "Apply to editor", **Then** the Zustand store updates with the trigger (type=scheduled, valid config) and all 3 steps are added with correct types, names, and configs
2. **Given** the editor already has a trigger and steps, **When** the user applies a new suggestion, **Then** the trigger is replaced and new steps are appended (not replacing existing ones), and the editor marks `isDirty=true` for auto-save
3. **Given** the AI suggests a workflow with an `app` step type, **When** applied, **Then** the step config matches the `AppStepConfig` schema with valid `app_id` and `action` fields

---

### User Story 3 - Full Workflow Context in AI System Prompt (Priority: P1)

The AI assistant has complete knowledge of all 9 trigger types (manual, scheduled, webhook, form, rss, mailhook, app, table, mcp) and all 8 step types (app, flow_control, ai, web_scraping, human_in_loop, utility, http, sequence) including their configuration schemas, default values, and variable interpolation syntax ({{trigger.field}}, {{step_N.output}}).

**Why this priority**: The AI must understand the domain to give useful suggestions. Without trigger/step context, it would hallucinate invalid configurations.

**Independent Test**: Can be tested by asking the AI about specific trigger/step capabilities and verifying accurate, schema-compliant responses.

**Acceptance Scenarios**:

1. **Given** the user asks "What triggers are available?", **When** the AI responds, **Then** it lists all 9 trigger types with accurate descriptions matching `trigger-metadata.ts`
2. **Given** the user asks "How do I reference data from step 1 in step 3?", **When** the AI responds, **Then** it explains the `{{step_1.output.field}}` variable interpolation syntax correctly
3. **Given** the user asks for a workflow with a cron schedule, **When** the AI suggests a trigger config, **Then** the `ScheduledTriggerConfig` has valid fields: `schedule_type`, `cron_expression`, `timezone`, etc.

---

### User Story 4 - Use Case Quick-Start Cards (Priority: P2)

The assistant panel shows 4 use-case cards (Meeting briefings, Competitor analysis, Email assistant, YouTube summarizer) when no messages exist. Clicking a card sends a pre-built prompt to the AI, which responds with a real AI-generated workflow suggestion (not hardcoded).

**Why this priority**: Quick-start cards improve discoverability and onboarding but are not essential for core functionality.

**Independent Test**: Click a use-case card and verify the AI generates a contextual workflow suggestion.

**Acceptance Scenarios**:

1. **Given** the chat is empty (no messages), **When** the user clicks "Meeting briefings", **Then** the prompt "Build a workflow for daily meeting briefings" is sent to the AI and a streaming response with a scheduled trigger + AI + HTTP steps is returned
2. **Given** the user has already sent messages, **When** they look at the chat, **Then** the use-case cards are hidden and only the message history is shown

---

### User Story 5 - Conversation Persistence (Priority: P3)

Chat messages for a workflow assistant session are persisted so that when the user navigates away and returns, the conversation history is preserved. Uses the existing `workflow_assistant_conversations` and `workflow_assistant_messages` tables pattern.

**Why this priority**: Nice-to-have for UX continuity but not blocking for core AI functionality.

**Independent Test**: Send messages, navigate away, return to editor, verify messages are still visible.

**Acceptance Scenarios**:

1. **Given** a user has sent 3 messages in the assistant, **When** they navigate to another page and return to the workflow editor, **Then** the previous 3 messages (and AI responses) are displayed in the chat
2. **Given** the user starts a new workflow (different ID), **When** they open the assistant, **Then** a fresh conversation starts (no messages from other workflows)

---

### Edge Cases

- What happens when the AI API (OpenAI) is unavailable or returns an error? Show a user-friendly error message.
- What happens when the user sends an empty message? Prevent submission.
- What happens when the AI suggests an invalid trigger/step type? Validate against known enums before applying.
- What happens when the user rapidly sends multiple messages? Queue them and prevent concurrent requests.
- What happens on mobile/small screens? The assistant panel should be a sheet/drawer instead of a side panel.

## Requirements

### Functional Requirements

- **FR-001**: System MUST replace the current hardcoded pattern-matching assistant API with a real AI-powered endpoint using Vercel AI SDK `streamText()`
- **FR-002**: System MUST stream AI responses token-by-token to the client using the Vercel AI SDK `useChat()` hook
- **FR-003**: System MUST include full workflow domain context (all 9 trigger types, 8 step types, their schemas, variable syntax) in the AI system prompt
- **FR-004**: System MUST pass the current workflow state (trigger, steps, name) as context with each message
- **FR-005**: System MUST support applying suggested workflows (trigger + steps) to the editor via Zustand store actions
- **FR-006**: System MUST validate suggested trigger/step types against known enums before applying to editor
- **FR-007**: System MUST handle AI API errors gracefully with user-friendly messages
- **FR-008**: System MUST support the existing use-case quick-start cards with real AI responses
- **FR-009**: AI responses MUST include structured `suggestedWorkflow` data when the user asks for workflow creation/modification

### Key Entities

- **WorkflowAssistantMessage**: role (user/assistant), content (text), suggestedWorkflow (optional structured data), workflowId (FK)
- **WorkflowContext**: Current trigger config, steps array, workflow name/status - passed with each AI request

## Success Criteria

### Measurable Outcomes

- **SC-001**: AI assistant responds with streaming text within 500ms of first token
- **SC-002**: 100% of suggested trigger types are valid enum values (manual, scheduled, webhook, form, rss, mailhook, app, table, mcp)
- **SC-003**: 100% of suggested step types are valid enum values (app, flow_control, ai, web_scraping, human_in_loop, utility, http, sequence)
- **SC-004**: Apply-to-editor action correctly updates Zustand store with trigger and all steps
- **SC-005**: Unit tests achieve >80% coverage for the assistant hook, API route, and system prompt builder
- **SC-006**: E2E Playwright tests verify full user flow: open panel, send message, receive streaming response, apply suggestion
