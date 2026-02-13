# Feature Specification: App Step AI-Powered Action Selection

**Feature Branch**: `016-app-step-ai`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Create the feature specification file for the App Step AI-Powered Action Selection feature"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Natural Language Instructions for App Actions (Priority: P1)

As a workflow builder, I want to describe what an app step should do in plain language so that I don't need to know specific API action names or parameter structures.

**Why this priority**: This is the core value proposition of the feature. Users are currently forced to know Composio's exact action names (e.g., "GITHUB_CREATE_ISSUE" vs "GITHUB_ISSUES_CREATE") and manually fill parameter fields. This creates friction and requires users to reference API documentation. Natural language instructions eliminate this entirely, making workflow building accessible to non-technical users.

**Independent Test**: Can be fully tested by creating a new workflow, adding an app step, selecting an app (e.g., Google Drive), entering instructions like "Upload the file to my Documents folder", saving the workflow, and verifying the config is stored as `{app_id: "google-drive", instructions: "Upload the file to my Documents folder"}` with no action or inputs fields.

**Acceptance Scenarios**:

1. **Given** a user is configuring a new app step, **When** they select an app from the connection grid, **Then** an instructions textarea appears with placeholder text "Describe what this step should do..." and no action dropdown or parameter fields are shown.
2. **Given** a user has typed instructions into the textarea, **When** they save the workflow, **Then** the `workflow_steps.config` JSONB column stores `{app_id: "slack", instructions: "Send a message to #general channel"}` with no `action` or `inputs` keys.
3. **Given** a user edits an existing app step with saved instructions, **When** they open the configuration panel, **Then** the instructions textarea is pre-populated with the saved text.
4. **Given** a user has entered instructions, **When** they clear the textarea, **Then** the step is invalid and cannot be saved (instructions are required).
5. **Given** a user has multiple connected apps, **When** they open the app step config, **Then** only their connected apps appear in the selection grid (not all available apps).

---

### User Story 2 - AI Action Selection at Runtime (Priority: P2)

As a workflow builder, I want the AI to automatically select the right app action and fill parameters at runtime so that my workflows execute correctly without manual API mapping.

**Why this priority**: This is the runtime execution layer that makes the natural language instructions functional. Without this, the simplified UI would be meaningless. However, it's P2 because the UI change (P1) can be developed and tested independently with mock data. The runtime AI logic is complex and requires integration with both Kiro Chat API and Composio SDK.

**Independent Test**: Can be fully tested by publishing a workflow with an app step containing instructions like "Create a new issue titled 'Bug report' in the main repository", triggering a manual run, and verifying the logs show: (1) AI fetched available actions from Composio, (2) AI selected `GITHUB_ISSUES_CREATE`, (3) AI generated parameters `{title: "Bug report", repo: "main"}`, (4) the action executed successfully, and (5) the run status is `completed`.

**Acceptance Scenarios**:

1. **Given** a workflow run reaches an app step with instructions "Send a Slack message saying hello", **When** the step executes, **Then** the AI calls Kiro Chat API with the instructions and the list of available Slack actions from Composio.
2. **Given** the AI receives available actions, **When** it determines the best action is `SLACK_SEND_MESSAGE`, **Then** it returns the action ID and generated parameters as a JSON object.
3. **Given** the AI has selected an action and parameters, **When** the system executes the action via Composio SDK, **Then** the action runs with the AI-generated parameters and the result is stored in `workflow_run_steps`.
4. **Given** the AI cannot determine a suitable action (ambiguous instructions), **When** the step executes, **Then** the run fails with status `failed` and an error message "Could not determine the appropriate action. Please provide more specific instructions."
5. **Given** the Composio action execution fails (e.g., invalid credentials), **When** the error occurs, **Then** the run status is set to `failed` and the error details are logged in `workflow_run_steps.error`.
6. **Given** a workflow run with multiple app steps, **When** each step executes, **Then** the AI selects actions independently for each step based on its unique instructions.

---

### User Story 3 - Connected Apps Filtering (Priority: P3)

As a workflow builder, I want to see only my connected apps when configuring an app step so that I know exactly which apps are available for use without being overwhelmed by unsupported options.

**Why this priority**: This improves UX by preventing users from configuring steps for apps they haven't connected, which would fail at runtime. However, it's P3 because the core functionality (P1/P2) works without filtering — users could technically select any app and get a runtime error if not connected. Filtering is a quality-of-life improvement, not a blocker.

**Independent Test**: Can be fully tested by connecting Google Drive and Slack via the app connections UI, then opening a new app step config and verifying only Google Drive and Slack appear in the grid. Then disconnecting Slack and verifying it disappears from the grid.

**Acceptance Scenarios**:

1. **Given** a user has connected Google Drive and Slack, **When** they open the app step config, **Then** the app selection grid shows exactly 2 apps: Google Drive and Slack.
2. **Given** a user has no connected apps, **When** they open the app step config, **Then** the grid shows a message "No apps connected. Connect apps in Settings to use them in workflows."
3. **Given** a user disconnects an app via Settings, **When** they return to an app step config, **Then** the disconnected app no longer appears in the selection grid.
4. **Given** a user has an existing app step configured for a now-disconnected app, **When** they edit the step, **Then** the config shows a warning "This app is no longer connected" and the user must either reconnect the app or select a different one.
5. **Given** a user connects a new app via Settings, **When** they open an app step config, **Then** the new app appears in the selection grid immediately without requiring a page refresh.

---

### Edge Cases

- **Empty instructions**: If a user saves an app step with blank instructions, the step should be marked invalid and the workflow should fail validation before publish.
- **Very long instructions**: If instructions exceed 2000 characters, the UI should show a character count warning and truncate at save time (to prevent JSONB bloat).
- **Ambiguous instructions**: If the AI cannot confidently select an action (e.g., "do something with files" when 20 file actions exist), the run should fail with a clear error message asking for more specificity.
- **Rate limiting**: If Kiro Chat API or Composio API rate-limits requests during a workflow run, the step should retry up to 3 times with exponential backoff before marking the run as failed.
- **Missing credentials**: If a user selects an app but their connection credentials are expired or invalid, the Composio action execution should fail gracefully with a descriptive error (not a 500 error).
- **Multiple matching actions**: If the AI identifies multiple equally valid actions (e.g., "send email" could be `GMAIL_SEND` or `OUTLOOK_SEND` if both are available), the AI should pick the first match from the Composio actions list and log the decision.
- **Action parameter mismatch**: If the AI generates parameters that don't match the Composio action schema (e.g., missing required field), the execution should fail and the error should indicate which parameter was invalid.
- **Concurrent runs**: If 10 workflows trigger simultaneously, each needing AI action selection, the system should queue the Kiro Chat API calls to avoid overwhelming the external API (rate limit: 10 req/s).
- **Backward compatibility**: Existing app steps with the old format `{app_id, action, inputs}` must continue to work without modification. The runtime must detect the format and skip AI selection if `action` is present.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST update the `AppStepConfig` TypeScript type to `{app_id: string, instructions: string}` (removing `action` and `inputs` fields).
- **FR-002**: System MUST provide a new AppStepConfig UI component that displays a grid of connected apps and an instructions textarea (no action dropdown, no parameter fields).
- **FR-003**: System MUST fetch the user's connected apps from the `app_connections` table (filtered by `team_id` and `status = 'connected'`) and display only those apps in the selection grid.
- **FR-004**: System MUST validate that `instructions` is a non-empty string (minimum 10 characters) before allowing the workflow to be saved.
- **FR-005**: System MUST store app step config as `{app_id: string, instructions: string}` in the `workflow_steps.config` JSONB column.
- **FR-006**: System MUST create a new runtime function `executeAppStepWithAI(step: WorkflowStep, context: RunContext)` that handles AI-powered action selection and execution.
- **FR-007**: System MUST call the Kiro Chat API (`/api/chat`) with a prompt containing the user's instructions and the list of available actions from Composio's `getActions(app_id)` method.
- **FR-008**: System MUST parse the AI's response to extract the selected action ID and generated parameters as a JSON object.
- **FR-009**: System MUST execute the selected action via Composio SDK using `composio.executeAction(action_id, parameters, connection_id)`.
- **FR-010**: System MUST handle AI selection failures (no action matched, ambiguous instructions) by marking the run status as `failed` and logging a descriptive error.
- **FR-011**: System MUST handle Composio execution failures (invalid credentials, network errors, parameter validation errors) by marking the run status as `failed` and logging the error details.
- **FR-012**: System MUST log the AI-selected action ID and parameters in `workflow_run_steps.metadata` JSONB column for debugging and audit purposes.
- **FR-013**: System MUST support backward compatibility: if an app step config contains an `action` field (old format), skip AI selection and execute the action directly with the provided `inputs`.
- **FR-014**: System MUST rate-limit Kiro Chat API calls to 10 requests per second per team to avoid external API throttling.
- **FR-015**: System MUST retry failed AI selection or Composio execution up to 3 times with exponential backoff (1s, 2s, 4s) before marking the run as failed.
- **FR-016**: System MUST validate AI-generated parameters against the Composio action schema before execution and fail gracefully if validation fails.
- **FR-017**: System MUST display a warning in the app step config UI if the selected app is no longer connected (status != 'connected').
- **FR-018**: System MUST truncate instructions to 2000 characters at save time and display a character counter in the UI.

### Key Entities

- **AppStepConfig** (Type Update): New shape `{app_id: string, instructions: string}`. Old shape `{app_id: string, action: string, inputs: Record<string, any>}` remains supported for backward compatibility. Stored in `workflow_steps.config` JSONB column.
- **WorkflowRunStep**: Execution record for each step. The `metadata` JSONB column will store AI-selected action details: `{selected_action: string, generated_parameters: Record<string, any>, ai_confidence: number}`.
- **AppConnection**: Links users to connected apps. Fields include `app_name` (e.g., "google-drive"), `status` ("connected" | "disconnected" | "error"), and `credentials` (JSONB containing OAuth tokens or API keys). Used to filter available apps in the UI and provide connection IDs to Composio SDK.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can configure an app step using only natural language instructions (no action selection) and save the workflow without errors.
- **SC-002**: When a workflow with an AI-powered app step is executed, the AI correctly selects an action and generates parameters in at least 90% of test cases (measured with 20 sample instructions across 5 different apps).
- **SC-003**: App step execution logs include the AI-selected action ID and parameters in `workflow_run_steps.metadata` for 100% of runs.
- **SC-004**: Existing workflows with the old app step format `{app_id, action, inputs}` continue to execute without modification (backward compatibility verified with 10 existing test workflows).
- **SC-005**: The app selection grid shows only connected apps (status = 'connected') for 100% of users, with zero disconnected apps appearing.
- **SC-006**: Build passes (`bun run build`) with zero TypeScript errors after all changes are applied.
- **SC-007**: All new code has unit test coverage of at least 80% (measured via Vitest coverage report).
- **SC-008**: End-to-end tests verify that a workflow with AI-powered app steps completes successfully in under 5 seconds (excluding external API latency).
