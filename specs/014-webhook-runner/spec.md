# Feature Specification: Webhook Runner

**Feature Branch**: `014-webhook-runner`
**Created**: 2026-02-12
**Status**: Draft
**Input**: Implement the backend webhook endpoint that receives incoming HTTP requests and triggers workflow execution.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Receive Webhook and Execute Workflow (Priority: P1)

As a workflow creator, I want external services to trigger my workflow by sending an HTTP request to a unique webhook URL, so that my workflow runs automatically when events happen in other systems.

When I configure a workflow with a "Webhook" trigger and publish it, the system generates a unique webhook URL. When an external service sends a request to that URL, the system validates the request, creates a new workflow run, executes all workflow steps in order, and returns the configured HTTP status code.

**Why this priority**: This is the core value proposition. Without the ability to receive and process webhook requests, the entire feature has no function.

**Independent Test**: Can be fully tested by sending an HTTP request to a webhook URL and verifying a workflow run is created and executed to completion.

**Acceptance Scenarios**:

1. **Given** a published workflow with a webhook trigger (POST method), **When** an external service sends a POST request to the webhook URL with a JSON body, **Then** the system creates a workflow run with trigger_type "webhook", stores the request payload as trigger data, executes all steps, and returns the configured status code (default 200).
2. **Given** a published workflow with a webhook trigger (GET method), **When** an external service sends a GET request to the webhook URL with query parameters, **Then** the system captures query parameters as trigger data and executes the workflow.
3. **Given** a published workflow with a webhook trigger, **When** the webhook receives a request and steps execute successfully, **Then** the workflow run status transitions from "pending" to "running" to "completed", and each step's input/output is recorded.
4. **Given** a published workflow with a webhook trigger, **When** a step fails during execution, **Then** the run is marked as "failed" with the error message, and the response still returns promptly.

---

### User Story 2 - Webhook URL Generation and Display (Priority: P2)

As a workflow creator, I want to see a real, unique webhook URL in the trigger configuration panel after saving my workflow, so that I can copy it and paste it into external services.

Currently, the webhook configuration UI shows a placeholder URL. After this feature, the system must generate a real, unique URL based on a token associated with the workflow's trigger.

**Why this priority**: Users need the URL to integrate with external systems. Without it, they cannot use the webhook trigger even if the backend works.

**Independent Test**: Can be tested by creating a workflow with a webhook trigger, saving it, and verifying the UI displays a real, copyable webhook URL that resolves to the correct endpoint.

**Acceptance Scenarios**:

1. **Given** a workflow with a webhook trigger, **When** the user saves the workflow, **Then** a unique webhook token is generated and stored, and the webhook URL is displayed in the trigger configuration panel.
2. **Given** a workflow with an existing webhook token, **When** the user re-opens the trigger configuration, **Then** the previously generated webhook URL is displayed (not regenerated).
3. **Given** a webhook URL displayed in the UI, **When** the user clicks the copy button, **Then** the full, valid URL is copied to the clipboard.

---

### User Story 3 - Secret Key Validation (Priority: P3)

As a workflow creator, I want to optionally set a secret key on my webhook trigger, so that only authorized services that know the secret can trigger my workflow.

When a secret key is configured, incoming requests must include the secret in the `x-webhook-secret` header. Requests without the correct secret are rejected with a 401 Unauthorized response.

**Why this priority**: Security is important but optional per trigger. Users can use webhooks without secrets if their use case doesn't require authentication.

**Independent Test**: Can be tested by configuring a secret key, then sending requests with and without the correct secret header, verifying correct rejection/acceptance behavior.

**Acceptance Scenarios**:

1. **Given** a webhook trigger with a secret key configured, **When** a request arrives with the correct secret in the `x-webhook-secret` header, **Then** the request is accepted and the workflow runs.
2. **Given** a webhook trigger with a secret key configured, **When** a request arrives without the secret header or with an incorrect secret, **Then** the request is rejected with a 401 status code and no workflow run is created.
3. **Given** a webhook trigger with no secret key configured, **When** any request arrives at the webhook URL, **Then** the request is accepted without secret validation.

---

### User Story 4 - HTTP Method Validation (Priority: P4)

As a workflow creator, I want the webhook to only accept requests using the HTTP method I configured (GET, POST, PUT, or PATCH), so that only properly formed requests trigger my workflow.

**Why this priority**: Method validation prevents accidental triggers from misconfigured integrations, but is a secondary concern to core functionality.

**Independent Test**: Can be tested by configuring a POST-only webhook and sending requests with different HTTP methods, verifying only POST is accepted.

**Acceptance Scenarios**:

1. **Given** a webhook trigger configured with POST method, **When** a POST request arrives, **Then** the request is accepted and the workflow runs.
2. **Given** a webhook trigger configured with POST method, **When** a GET request arrives, **Then** the request is rejected with a 405 Method Not Allowed status code.

---

### Edge Cases

- What happens when a webhook URL is called for a workflow that has been unpublished (draft status)? The system should return 404 and not create a run.
- What happens when a webhook URL is called for a deleted workflow? The system should return 404.
- What happens when the webhook request body is not valid JSON? The system should accept the raw body and store it as-is in trigger data.
- What happens when multiple requests hit the same webhook URL simultaneously? Each request should create its own independent workflow run.
- What happens when a webhook trigger token does not exist? The system should return 404.
- What happens when the webhook request body is empty? The system should proceed with empty trigger data.
- What happens when a workflow step execution takes too long? The system should return the response status code promptly and process the workflow execution asynchronously or with a reasonable timeout.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST expose a public endpoint that accepts HTTP requests at a unique URL per webhook trigger.
- **FR-002**: System MUST resolve the webhook token from the URL to the corresponding workflow and trigger configuration.
- **FR-003**: System MUST validate that the incoming request HTTP method matches the configured method (GET, POST, PUT, PATCH), returning 405 for mismatches.
- **FR-004**: System MUST validate the secret key from the `x-webhook-secret` header when a secret is configured on the trigger, returning 401 for invalid/missing secrets.
- **FR-005**: System MUST create a workflow run record with trigger_type "webhook" and store the request payload (body, headers, query parameters) as trigger data.
- **FR-006**: System MUST execute all workflow steps in sequential order, starting from the first step after the trigger.
- **FR-007**: System MUST return the configured HTTP response status code (default 200) after accepting the webhook request.
- **FR-008**: System MUST generate a unique, non-guessable webhook token when a webhook trigger is first saved, and store it in the trigger configuration.
- **FR-009**: System MUST display the real webhook URL in the trigger configuration UI after the workflow is saved, replacing the current placeholder.
- **FR-010**: System MUST reject webhook requests for workflows that are not in "published" status, returning 404.
- **FR-011**: System MUST record each step's execution status, output, errors, and duration for the webhook-triggered run.
- **FR-012**: System MUST handle step failures gracefully — marking the run as failed with the error details without crashing.

### Key Entities

- **Webhook Token**: A unique, non-guessable identifier that maps a public URL to a specific workflow trigger. Stored as part of the trigger configuration.
- **Webhook Trigger Data**: The captured request payload (body, query parameters, headers) stored alongside the workflow run for reference and use by subsequent steps.
- **Workflow Run (webhook-triggered)**: A run record created from a webhook request, with trigger_type "webhook" and trigger_data containing the request payload.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: External services can trigger a workflow by sending an HTTP request to the webhook URL and receive a response within 3 seconds.
- **SC-002**: 100% of webhook requests with valid tokens for published workflows create a workflow run and begin execution.
- **SC-003**: 100% of webhook requests with incorrect or missing secrets (when configured) are rejected without creating a run.
- **SC-004**: 100% of webhook requests with mismatched HTTP methods are rejected with a 405 status code.
- **SC-005**: Users can copy the webhook URL from the UI and use it in external services without modification.
- **SC-006**: Webhook-triggered runs appear in the workflow's run history with complete step-by-step execution details.
- **SC-007**: The system handles at least 10 concurrent webhook requests for the same workflow without errors or data corruption.
