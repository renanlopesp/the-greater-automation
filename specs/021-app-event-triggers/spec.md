# Feature Specification: App Event Triggers (Event-Driven Workflow Execution)

**Feature Branch**: `021-app-event-triggers`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "App as Runner/Trigger — apps should trigger workflows via events (PR opened, message received, etc.), enabling multi-step automated pipelines with Claude multi-agent integration"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Subscribe to App Events (Priority: P1)

A user wants their workflow to automatically run when something happens in a connected app. They go to an existing workflow, select "App Event" as the trigger type, choose from a list of available events for their connected apps (e.g., "GitHub: Pull Request Opened"), configure any filters (e.g., only PRs targeting `main` branch), and activate the subscription. From that point on, whenever that event fires in the external app, the workflow starts automatically.

**Why this priority**: This is the foundational capability — without event subscriptions, nothing else works. It unlocks the entire event-driven paradigm.

**Independent Test**: Can be fully tested by connecting a GitHub account, subscribing to "PR Opened" events on a test repo, opening a PR, and verifying the workflow run appears in run history with the correct event payload.

**Acceptance Scenarios**:

1. **Given** a user has GitHub connected and a workflow exists, **When** they select "GitHub: Pull Request Opened" as the trigger and enable it, **Then** a trigger subscription is created and the workflow shows "Active — listening for PR events"
2. **Given** an active trigger subscription exists, **When** a matching event fires in the external app, **Then** a new workflow run starts automatically with the event payload available to all steps
3. **Given** an active trigger subscription exists, **When** the user disables it, **Then** no new workflow runs are created for that event type until re-enabled
4. **Given** a trigger subscription with filters (e.g., branch = main), **When** an event fires that does not match the filter, **Then** no workflow run is created

---

### User Story 2 - Multi-Step Pipeline Execution (Priority: P1)

A user wants to build a complex pipeline that responds to an app event with multiple automated steps. For example: when a PR is opened on GitHub, the workflow should (1) fetch PR details and diff, (2) run a Claude agent to analyze the code, (3) run unit tests, (4) run e2e tests, and (5) post a summary comment back to the PR. Each step can pass its output to the next, and the user can see real-time progress of each step.

**Why this priority**: This is the core value proposition — event-driven multi-step automation. Without pipelines, event triggers are just notifications.

**Independent Test**: Can be tested by creating a workflow with 3+ steps (fetch data, AI analysis, post comment), triggering it via a test event, and verifying each step executes in order with data flowing between them.

**Acceptance Scenarios**:

1. **Given** a workflow with sequential steps A, B, C, **When** triggered by an app event, **Then** step A runs first, its output is available to step B, and B's output is available to step C
2. **Given** a workflow with a step that fails, **When** the step encounters an error, **Then** subsequent steps are skipped (unless configured to continue), and the run is marked as failed with error details
3. **Given** a running multi-step workflow, **When** a user views the run details, **Then** they see each step's status (pending/running/completed/failed), duration, and output
4. **Given** a workflow with conditional branching, **When** step A produces a result matching a condition, **Then** the correct branch of steps executes based on that condition

---

### User Story 3 - Claude Agent as Workflow Step (Priority: P2)

A user wants to include an AI-powered analysis step in their workflow. They configure a "Claude Agent" step type with a specific prompt template, select which tools the agent can use (file reading, code analysis, web search), and define what output the agent should produce. When the workflow runs, the Claude agent receives the event data and outputs from previous steps, performs its analysis, and returns structured results that feed into the next step.

**Why this priority**: AI-powered steps are a key differentiator. They transform simple automation into intelligent automation, but the event trigger and pipeline infrastructure must exist first.

**Independent Test**: Can be tested by creating a workflow with a Claude agent step, providing sample input data, running the workflow, and verifying the agent produces structured output that matches the expected format.

**Acceptance Scenarios**:

1. **Given** a workflow step configured as "Claude Agent" with a code review prompt, **When** the step receives PR diff data from a previous step, **Then** the agent analyzes the code and returns a structured review (issues found, severity, suggestions)
2. **Given** a Claude agent step with tool access enabled, **When** the step runs, **Then** the agent can use configured tools (e.g., read files from the repo) to enrich its analysis
3. **Given** a Claude agent step completes, **When** the next step accesses its output, **Then** the output is available as structured data (not just raw text)

---

### User Story 4 - Event Payload Mapping and Filtering (Priority: P2)

A user wants to control which events trigger their workflow and how event data maps to workflow inputs. They configure field mappings (e.g., "PR title" maps to workflow variable `title`, "PR diff URL" maps to `diff_url`) and set up filters (e.g., only trigger for PRs with label "needs-review" or targeting branch "main"). The system should show a preview of sample payloads so users understand what data is available.

**Why this priority**: Filtering prevents noise (too many unwanted triggers) and mapping ensures workflow steps get clean, predictable inputs. Important for usability but the system works without it (just noisier).

**Independent Test**: Can be tested by configuring filters on a trigger, sending events that match and don't match, and verifying only matching events create runs.

**Acceptance Scenarios**:

1. **Given** a trigger with filter "label = needs-review", **When** a PR is opened without that label, **Then** no workflow run is created
2. **Given** a trigger with filter "label = needs-review", **When** a PR is opened with that label, **Then** a workflow run is created
3. **Given** a trigger with field mappings configured, **When** an event fires, **Then** the mapped fields are available to workflow steps under the configured variable names
4. **Given** a user is configuring a trigger, **When** they select an event type, **Then** they can see a sample payload showing all available fields

---

### User Story 5 - Execution Monitoring Dashboard (Priority: P3)

A user wants to monitor all event-triggered workflow runs in one place. They can see a live feed of runs with their status, filter by event type or workflow, drill into any run to see step-by-step execution details, and retry failed runs. The dashboard updates in real-time as runs progress.

**Why this priority**: Monitoring is essential for production use but the core functionality works without a dedicated dashboard (users can see runs in existing run history).

**Independent Test**: Can be tested by triggering several workflows, viewing the monitoring dashboard, and verifying all runs appear with correct statuses and drill-down works.

**Acceptance Scenarios**:

1. **Given** multiple event-triggered runs exist, **When** a user opens the monitoring view, **Then** they see all runs sorted by most recent, with event source, workflow name, status, and duration
2. **Given** a failed run, **When** the user clicks "Retry", **Then** a new run is created with the same event payload
3. **Given** a run is in progress, **When** the user views the run details, **Then** step statuses update in real-time without page refresh

---

### Edge Cases

- What happens when an event fires but the connected app token has expired? The system marks the run as failed with an "authentication expired" error and notifies the user to reconnect the app.
- What happens when an event fires for a disabled workflow? The event is acknowledged but no run is created. The event is logged for debugging purposes.
- What happens when two events fire simultaneously for the same workflow? Both runs are created independently and execute concurrently. Each run has its own isolated state.
- What happens when a Claude agent step times out? The step is marked as failed with a timeout error after the configured maximum duration (default: 5 minutes). The user can configure longer timeouts for complex analyses.
- What happens when the event payload is malformed or missing expected fields? The workflow run starts but steps that depend on missing fields fail gracefully with descriptive error messages indicating which fields were expected but missing.
- What happens when a workspace reaches the maximum number of active trigger subscriptions? The system shows a clear message indicating the limit (default: 50 active subscriptions) and prevents creating new subscriptions until existing ones are removed or disabled.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to select app events as workflow triggers from their connected apps
- **FR-002**: System MUST subscribe to external app events via the integration provider and receive event callbacks
- **FR-003**: System MUST automatically start a workflow run when a matching event is received
- **FR-004**: System MUST pass the full event payload to the first workflow step as input data
- **FR-005**: System MUST support sequential multi-step pipeline execution where each step's output feeds into the next
- **FR-006**: System MUST support a "Claude Agent" step type that performs AI analysis with configurable prompts and tool access
- **FR-007**: System MUST display real-time step-by-step execution progress for running workflows
- **FR-008**: System MUST support enabling and disabling trigger subscriptions without deleting them
- **FR-009**: System MUST support filtering events by field values before triggering a run (e.g., branch name, labels)
- **FR-010**: System MUST handle step failures gracefully — marking the run as failed, logging the error, and skipping subsequent dependent steps
- **FR-011**: System MUST allow users to view the event payload that triggered any historical run
- **FR-012**: System MUST allow users to retry failed runs with the original event payload
- **FR-013**: System MUST enforce a maximum number of active trigger subscriptions per workspace
- **FR-014**: System MUST support conditional branching within pipelines based on step outputs or event data
- **FR-015**: System MUST show available event types and sample payloads when a user configures a trigger for a connected app

### Key Entities

- **Trigger Subscription**: A persistent configuration linking an external app event to a workflow. Contains the event type, source app, filters, field mappings, and enabled/disabled state.
- **Event Callback**: An incoming notification from the integration provider indicating an event occurred. Contains the event type, timestamp, source app, and full payload.
- **Pipeline Run**: A single execution of a workflow triggered by an event. Contains the trigger event data, an ordered list of step executions, overall status, and timing.
- **Step Execution**: A single step within a pipeline run. Contains the step configuration, input data (from event or previous step), output data, status, duration, and error details if failed.
- **Agent Step Configuration**: Configuration for a Claude Agent step type. Contains the prompt template, available tools, model preferences, timeout, and expected output format.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can configure an app event trigger and receive the first automated workflow run within 30 seconds of the event occurring in the external app
- **SC-002**: Multi-step pipelines with 5+ steps complete successfully with data flowing between all steps in at least 95% of runs (excluding external service failures)
- **SC-003**: Users can see real-time step progress updates within 2 seconds of a step status change
- **SC-004**: 90% of users can set up their first event-triggered workflow without documentation, using only the in-app trigger configuration UI
- **SC-005**: Failed runs can be retried with one click, and the retry uses the exact same event payload as the original run
- **SC-006**: The system handles at least 100 concurrent event-triggered workflow runs without degradation
- **SC-007**: Claude Agent steps produce structured, machine-readable output that subsequent steps can consume without manual parsing in at least 90% of executions

## Assumptions

- Users have already connected their apps (GitHub, Discord, etc.) via the existing OAuth/integration flow
- The integration provider (Composio) supports trigger subscriptions with webhook callbacks for the target apps
- Claude agent steps use the existing AI infrastructure (same model provider, same tool framework)
- Event delivery follows at-least-once semantics — the system should handle duplicate events gracefully (idempotency)
- Workflow step execution happens server-side, not in the user's browser
- The existing workflow editor UI will be extended (not replaced) to support the new trigger types and step types

## Scope Boundaries

**In scope**:

- App event trigger subscriptions via integration provider
- Sequential and conditional multi-step pipeline execution
- Claude Agent as a workflow step type
- Real-time execution progress tracking
- Event filtering and payload mapping
- Run retry functionality

**Out of scope**:

- Building a full CI/CD system (we orchestrate, not execute builds directly)
- Custom webhook signature validation beyond what the integration provider offers
- Real-time streaming of test output within steps (just final results)
- Self-hosted runner infrastructure
- File-based skill execution within workflow steps (future enhancement)
- Marketplace for pre-built workflow templates (future enhancement)
