# Feature Specification: App Connections & OAuth Integrations

**Feature Branch**: `015-app-step`
**Created**: 2026-02-12
**Status**: Draft
**Input**: Real OAuth integrations for GitHub, Notion, Slack, LinkedIn, Discord

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect an App via OAuth (Priority: P1)

A user navigates to Settings > Integrations (or clicks "Integrations" in the sidebar). They see the list of available apps. They click "Connect" on Slack. A popup/redirect takes them to Slack's OAuth consent screen where they authorize Relay. After granting permission, they are redirected back to Relay and see Slack now shows as "Connected" with their workspace name. They can disconnect at any time.

**Why this priority**: Without OAuth connections, no app integration can work. This is the foundation.

**Independent Test**: Can be fully tested by clicking Connect on any app, completing the OAuth flow, and seeing the connection status update.

**Acceptance Scenarios**:

1. **Given** a user is on the Integrations page, **When** they click "Connect" on Slack, **Then** they are redirected to Slack's OAuth authorization page
2. **Given** a user has authorized Relay on Slack, **When** they are redirected back, **Then** the connection is stored and Slack shows as "Connected"
3. **Given** a user has a connected app, **When** they click "Disconnect", **Then** the connection is removed and the app shows as available to connect
4. **Given** a user's OAuth token has expired, **When** a workflow uses that app, **Then** the system automatically refreshes the token using the refresh_token
5. **Given** a user connects the same app twice, **When** they complete OAuth, **Then** the existing connection is updated (not duplicated)

---

### User Story 2 - Use Connected App in Workflow Step (Priority: P2)

A user adds an "App" step in the workflow editor. Instead of raw text fields, they see a grid of apps they've already connected. They select Slack, choose "Send Message" action, fill in channel and message fields, and save. When the workflow runs, the step uses their stored OAuth token to actually call the Slack API.

**Why this priority**: This is the core value - using real API connections in workflows.

**Independent Test**: Can be tested by adding an App step, selecting a connected app, configuring an action, running the workflow, and verifying the real API call succeeds.

**Acceptance Scenarios**:

1. **Given** a user has connected Slack, **When** they add an App step, **Then** Slack appears in the available apps with a "connected" indicator
2. **Given** a user selects a connected app, **When** they pick an action, **Then** the config form shows action-specific input fields
3. **Given** a workflow with a Slack "Send Message" step runs, **When** the step executes, **Then** a real message is posted to the specified Slack channel
4. **Given** a user has NOT connected an app, **When** they try to add it as a step, **Then** they see a prompt to connect the app first

---

### User Story 3 - App Actions for 5 Integrations (Priority: P2)

Each connected app exposes specific actions that users can configure in workflow steps:

- **GitHub**: Create Issue, Create PR Comment, List Repos, Star Repo
- **Notion**: Create Page, Update Page, Search, Query Database
- **Slack**: Send Message, Send DM, Create Channel, List Channels
- **LinkedIn**: Create Post, Share Article
- **Discord**: Send Message (webhook), Send Embed, Create Thread

**Why this priority**: Actions are what make integrations useful. Without actions, connections are pointless.

**Independent Test**: Can be tested by configuring each action type and verifying the API call succeeds with correct parameters.

**Acceptance Scenarios**:

1. **Given** a user selects GitHub in an App step, **When** they view available actions, **Then** they see Create Issue, Create PR Comment, List Repos, Star Repo
2. **Given** a user configures a "Create Issue" action with title and body, **When** the workflow runs, **Then** a real GitHub issue is created in the specified repo
3. **Given** a user configures a Notion "Create Page" action, **When** the workflow runs, **Then** a real page is created in the specified Notion workspace

---

### User Story 4 - Connection Management & Security (Priority: P3)

OAuth tokens are stored encrypted in the database. Users can view their active connections, see when they were last used, and revoke access. Expired tokens are automatically refreshed. If a refresh fails, the user is notified.

**Why this priority**: Security and token management are essential for production use but can be iteratively improved.

**Independent Test**: Can be tested by verifying encrypted storage, token refresh flow, and disconnect cleanup.

**Acceptance Scenarios**:

1. **Given** a user's access token expires, **When** a workflow step tries to use it, **Then** the system refreshes the token and retries the API call
2. **Given** a user disconnects an app, **When** they view their connections, **Then** the tokens are deleted and any workflows using that app show a warning
3. **Given** an OAuth token is stored, **When** the database is queried directly, **Then** the token values are encrypted (not plaintext)

---

### Edge Cases

- What happens when OAuth provider is down during authorization? Show error and allow retry.
- What happens when a user revokes access on the provider's side (e.g., in Slack settings)? The next API call fails, mark connection as broken, prompt user to reconnect.
- What happens when multiple team members connect the same app? Each user has their own connection; workflows use the connection of the user who created the workflow.
- What happens when OAuth callback receives an error? Display a clear error message and redirect back to integrations page.
- What happens when rate limits are hit on a provider? Return error with retry-after information.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support OAuth 2.0 authorization code flow for GitHub, Notion, Slack, LinkedIn, and Discord
- **FR-002**: System MUST store OAuth tokens (access_token, refresh_token, expires_at) encrypted in the database
- **FR-003**: System MUST provide API routes for initiating OAuth flow, handling callbacks, and disconnecting apps
- **FR-004**: System MUST automatically refresh expired access tokens using stored refresh tokens
- **FR-005**: System MUST display connection status (connected/disconnected) in the Manage Apps UI
- **FR-006**: System MUST allow users to disconnect an app, deleting all stored tokens
- **FR-007**: System MUST provide an App step config UI that shows only connected apps with their available actions
- **FR-008**: System MUST execute real API calls using stored OAuth tokens when an App step runs
- **FR-009**: System MUST define action schemas (inputs/outputs) for each supported app integration
- **FR-010**: System MUST handle API errors gracefully and record them in workflow run step output
- **FR-011**: System MUST support both webhook executor and SDK executor for App step execution
- **FR-012**: System MUST validate OAuth configuration (client_id, client_secret) at startup

### Key Entities

- **App Connection**: A user's authenticated connection to an external app (user_id, app_id, provider, access_token, refresh_token, expires_at, scopes, account_label, metadata)
- **OAuth Provider Config**: Static configuration for each OAuth provider (client_id, client_secret, authorize_url, token_url, scopes, redirect_uri)
- **App Action Definition**: A specific operation within an app (action_id, app_id, name, description, input_schema, output_schema)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can connect all 5 apps (GitHub, Notion, Slack, LinkedIn, Discord) via OAuth within 60 seconds each
- **SC-002**: Connected apps show accurate status in the Integrations UI immediately after OAuth completion
- **SC-003**: Workflow steps using connected apps successfully make real API calls at least 95% of the time (excluding provider outages)
- **SC-004**: Token refresh happens transparently without user intervention
- **SC-005**: All OAuth tokens are stored encrypted - no plaintext tokens in the database

## Scope

### In Scope

- OAuth 2.0 flow for 5 providers (GitHub, Notion, Slack, LinkedIn, Discord)
- Database migration for app_connections table
- Encrypted token storage and automatic refresh
- OAuth API routes (connect, callback, disconnect, status)
- App action definitions with input/output schemas for all 5 apps
- Real API execution handlers for each app's actions
- Updated App step config UI showing connected apps and action forms
- Updated Manage Apps UI with real connection status
- Webhook executor integration for app steps
- Unit tests for OAuth flow, token management, API handlers
- E2E tests for connecting an app and using it in a workflow step

### Out of Scope

- OAuth for apps beyond the initial 5
- Webhook-only integrations (Telegram, SendGrid, etc.) - separate feature
- Custom OAuth provider configuration by users
- Team-shared connections (each user manages their own)
- Detailed API usage analytics or rate limit dashboards
- OAuth PKCE flow (standard authorization code is sufficient)

## Assumptions

- OAuth client credentials (client_id, client_secret) for each provider will be configured via environment variables
- The app uses server-side rendering, so OAuth callbacks hit the server directly
- Encryption for token storage uses the existing crypto utilities in the project
- Each user connects apps independently; a workflow uses the creator's connections
- Discord will use both OAuth (for bot actions) and webhook URLs (for simple message sending)

## Dependencies

- Existing crypto utilities (src/lib/crypto.ts) for token encryption
- Existing app-integrations.ts for app metadata
- Existing workflow editor infrastructure
- OAuth applications created on each provider's developer portal (GitHub Apps, Slack Apps, etc.)
- Environment variables for client credentials
