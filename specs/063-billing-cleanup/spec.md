# Feature Specification: Billing + Cleanup

**Feature Branch**: `063-billing-cleanup`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: Part of 058 Managed Agents Migration (spec 058-F from MASTER_PLAN)

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Accurate Credit Tracking Per Conversation (Priority: P1)

Credits are deducted based on actual token usage from each conversation session. The billing system differentiates between models (standard vs advanced) and applies appropriate rates. Users can see their credit consumption in the billing dashboard.

**Why this priority**: Accurate billing is essential for business sustainability and customer trust.

**Independent Test**: Send 5 messages in chat, check the billing dashboard — credit deductions match the tokens consumed with model-appropriate rates applied.

**Acceptance Scenarios**:

1. **Given** a conversation with the standard model, **When** the agent responds using 1000 tokens, **Then** credits are deducted at the standard rate.
2. **Given** a conversation with the advanced model, **When** the agent responds, **Then** credits are deducted at the higher advanced rate.
3. **Given** a team's credit usage, **When** they check the billing dashboard, **Then** usage breakdown shows per-conversation token consumption.

---

### User Story 2 — Pre-Chat Credit Check (Priority: P1)

Before processing any message, the system checks if the team has sufficient credits. If credits are exhausted, the user receives a clear message explaining they need to add credits, with a link to the billing page.

**Why this priority**: Prevents usage without payment, protects against billing disputes.

**Independent Test**: Set a team's credits to 0, try to send a message — receive a clear "insufficient credits" message instead of a response.

**Acceptance Scenarios**:

1. **Given** a team with 0 credits, **When** they send a message, **Then** they receive a message about insufficient credits before any AI processing occurs.
2. **Given** a team with low credits (enough for ~1 more message), **When** they send a message, **Then** the message is processed but a warning is shown about remaining credits.

---

### User Story 3 — Dead Code Removal (Priority: P2)

All legacy code from the pre-migration architecture is removed: the old agent chat engine, OpenAI provider routing, step counting, Kiro legacy code, and old Composio session management. The codebase is clean and only contains the Managed Agents architecture.

**Why this priority**: Clean codebase reduces confusion, maintenance burden, and potential bugs from dead code paths.

**Independent Test**: Build passes. No dead imports. No references to removed files. All tests pass.

**Acceptance Scenarios**:

1. **Given** the old chat engine file is deleted (874 lines), **When** the project builds, **Then** zero errors occur.
2. **Given** provider routing code is removed, **When** searching for OpenAI provider references, **Then** no results are found.
3. **Given** step counting logic is removed, **When** searching the codebase, **Then** no references to step count limiting remain.
4. **Given** all cleanup is complete, **When** running the full test suite, **Then** all tests pass.

---

### User Story 4 — Documentation Updated (Priority: P3)

Project documentation (CLAUDE.md, architecture docs) is updated to reflect the new Managed Agents architecture. Stale entries about old technologies are removed.

**Why this priority**: Accurate documentation prevents confusion for future development but is lowest priority.

**Independent Test**: Read CLAUDE.md — all Active Technologies entries reflect the current architecture.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** reading CLAUDE.md, **Then** Active Technologies lists only current technologies (no OpenAI, no Kiro, no step counting references).

---

### Edge Cases

- What happens if a file to be deleted is imported by other files? → Fix all imports before deletion.
- What happens if tests reference deleted modules? → Update or remove affected tests.
- What happens if billing data has inconsistencies from the migration period? → Log discrepancies for manual review.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST extract token usage from session events and deduct credits accurately
- **FR-002**: System MUST apply model-specific billing rates (different rates for standard vs advanced model)
- **FR-003**: System MUST check credit balance before processing any chat message
- **FR-004**: System MUST display clear messages when credits are insufficient
- **FR-005**: The old chat engine file (agent-chat.ts, ~874 lines) MUST be deleted
- **FR-006**: The Kiro legacy chat file (chat.ts) MUST be deleted
- **FR-007**: The old Composio session management file (composio-session.ts) MUST be deleted
- **FR-008**: OpenAI provider imports and routing logic MUST be removed
- **FR-009**: Step counting/limiting logic MUST be removed
- **FR-010**: Platform tools file MUST be trimmed — only buildOrchestratorSystemPrompt() remains, tool definitions removed (now in MCP server)
- **FR-011**: CLAUDE.md MUST be updated to remove stale Active Technologies entries
- **FR-012**: All existing tests MUST pass after cleanup

### Files to Delete

- `src/lib/ai/agent-chat.ts` — old chat engine (874 lines)
- `src/lib/ai/chat.ts` — Kiro legacy
- `src/lib/composio/composio-session.ts` — old session management

### Files to Trim

- `src/lib/ai/platform-tools.ts` — keep only `buildOrchestratorSystemPrompt()`, remove all tool definitions (moved to MCP)

### Key Entities

- **Credit**: Unit of billing consumed per token. Rates differ by model.
- **Usage Record**: Per-conversation token consumption record for billing transparency.

### Assumptions

- All previous specs (058-A through 058-E) are complete and working before cleanup begins
- The MCP server handles all tool execution — the tool definitions in platform-tools.ts are no longer needed
- Existing billing infrastructure (Stripe integration, credit tracking tables) can be extended for session-based billing
- No external systems depend on the files being deleted

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Credit deductions match actual token usage within 5% margin
- **SC-002**: Users with insufficient credits are blocked before AI processing (no free usage)
- **SC-003**: Build passes with zero errors after all deletions
- **SC-004**: All existing tests pass after cleanup
- **SC-005**: Codebase is reduced by at least 1000 lines of dead code
- **SC-006**: CLAUDE.md accurately reflects current architecture
