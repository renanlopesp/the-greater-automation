# Tasks: Unified Agent Generators

**Input**: Design documents from `/specs/062-unified-agent-generators/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extract shared provisioning logic and create the internal Agent client — all generators depend on this.

**CRITICAL**: No generator migration can begin until this phase is complete.

- [x] T001 Extract provisioning logic from src/app/api/agents/provision/route.ts into src/lib/ai/agent-provisioning.ts — move agent creation, environment creation, system prompt building, MCP URL construction, and team ID persistence into a reusable `provisionAgent(teamId)` function
- [x] T002 Update src/app/api/agents/provision/route.ts to import and call the extracted `provisionAgent()` function instead of inline logic — verify existing provisioning behavior unchanged
- [x] T003 Create src/lib/ai/agent-client.ts with `askAgent(teamId, prompt, options?)` — looks up team's agent_id/env_id, auto-provisions if needed, creates session, sends message via events.send(), collects full response via events.stream(), returns `{ text, usage, sessionId }`
- [x] T004 Add `askAgentJSON<T>(teamId, prompt, schema, options?)` to src/lib/ai/agent-client.ts — wraps askAgent with JSON instruction appending, response parsing (strip markdown fences), Zod validation, and one retry on parse failure

**Checkpoint**: Internal Agent client ready — generator migration can begin

---

## Phase 2: User Story 1 — Internal Agent Client Validation (Priority: P1) MVP

**Goal**: Prove the internal client works end-to-end by migrating the first generator.

**Independent Test**: Call `askAgentJSON()` from brand-dna-analyzer with a team that has a provisioned Agent and verify structured brand DNA output.

### Implementation

- [ ] T005 [US1] Migrate src/lib/ai/brand-dna-analyzer.ts — replace `getOpenAIProvider()` + `generateObject()` calls with `askAgentJSON(teamId, prompt, BrandDnaSchema)`. Remove manual context fetching (store info, products) from the prompt since the Agent already has this via system prompt and MCP tools. Keep the Zod schemas for response validation.
- [ ] T006 [US1] Update src/app/api/onboarding/analyze/route.ts (or wherever brand-dna-analyzer is called) to pass `teamId` to the analyzer function
- [ ] T007 [US1] Verify via Playwright: trigger onboarding brand DNA analysis for a test store, confirm the output includes store-specific details (product references, segment, visual palette)

**Checkpoint**: Brand DNA analysis works through the Agent — MVP validated

---

## Phase 3: User Story 2 — Campaign Content Generation (Priority: P1)

**Goal**: Migrate all seasonal campaign generators to use the Agent for brand-aware content.

**Independent Test**: Generate a seasonal campaign and verify content uses the brand's tone, mentions real products, and follows positioning.

### Implementation

- [ ] T008 [US2] Migrate src/lib/ai/seasonal-campaign-generator.ts `generateConcept()` — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, ConceptSchema)`. Remove manual brand DNA injection from prompt.
- [ ] T009 [US2] Migrate src/lib/ai/seasonal-campaign-generator.ts `generateCopies()` — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, CopiesSchema)`
- [ ] T010 [US2] Migrate src/lib/ai/seasonal-campaign-generator.ts `generateDeliverables()` — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, DeliverablesSchema)`
- [ ] T011 [US2] Migrate src/lib/ai/seasonal-campaign-generator.ts `generateVideoScript()` — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, VideoScriptSchema)`
- [ ] T012 [P] [US2] Migrate src/lib/ai/store-visual-analyzer.ts — replace `generateObject(openai.responses('gpt-5.2'))` with `askAgentJSON(teamId, prompt, VisualAnalysisSchema)`
- [ ] T013 [US2] Update all callers of seasonal-campaign-generator and store-visual-analyzer to pass `teamId` parameter
- [ ] T014 [US2] Verify via Playwright: generate a seasonal campaign for a store with brand DNA, confirm content reflects brand tone and mentions real products

**Checkpoint**: Campaign generation fully Agent-mediated

---

## Phase 4: User Story 3 — Secondary Generators (Priority: P1)

**Goal**: Migrate remaining generators (assets, emails) to complete the core generator migration.

**Independent Test**: Generate an asset and email template, verify brand-consistent output.

### Implementation

- [ ] T015 [P] [US3] Migrate src/lib/ai/asset-generator.ts — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, AssetSchema)`. Update callers to pass `teamId`.
- [ ] T016 [P] [US3] Migrate src/lib/ai/email-template-generator.ts — replace `generateObject(openai)` with `askAgentJSON(teamId, prompt, EmailTemplateSchema)`. Update callers to pass `teamId`.
- [ ] T017 [US3] Verify asset and email generation produce brand-consistent output

**Checkpoint**: All content generators use the Agent

---

## Phase 5: User Story 4 — Follow-up Suggestions (Priority: P2)

**Goal**: Remove the separate OpenAI call for follow-ups since the Agent already generates them.

**Independent Test**: Send a chat message and verify follow-up suggestions appear without any separate model call.

### Implementation

- [ ] T018 [US4] Analyze src/lib/actions/follow-ups.ts — confirm the Agent already generates follow-ups as part of its response (verified via Playwright "Acompanhamentos" section)
- [ ] T019 [US4] Remove or no-op the OpenAI call in src/lib/actions/follow-ups.ts — if the chat route already parses Agent follow-ups, delete the file. If not, update to extract follow-ups from the Agent's response instead of making a separate call.
- [ ] T020 [US4] Verify via Playwright: send a chat message, confirm follow-up suggestions appear and are contextually relevant

**Checkpoint**: Follow-ups work without any external model call

---

## Phase 6: User Story 5 — Workflow AI Steps + Cleanup (Priority: P3)

**Goal**: Migrate workflow AI steps from OpenAI to Anthropic SDK, remove OpenAI dependency entirely.

**Independent Test**: Run a workflow with an AI step and verify it produces expected output. Build passes with zero OpenAI references.

### Implementation

- [ ] T021 [US5] Migrate src/lib/workflows/action-executor.ts — replace `createOpenAI()` with Anthropic SDK (`import Anthropic from '@anthropic-ai/sdk'`). Use `claude-haiku-4-5` for simple transforms (summarize, classify) and `claude-sonnet-4-6` for complex generation. Replace `generateObject`/`generateText` with `anthropic.messages.create()`.
- [ ] T022 [P] [US5] Migrate src/app/api/workflows/[id]/assistant/route.ts — replace `createOpenAI()` + `getOpenAIProvider()` with Anthropic SDK. Update model references from `gpt-4o` to `claude-sonnet-4-6`.
- [ ] T023 [P] [US5] Update src/components/agent-detail/agent-form.tsx — remove GPT-4 and GPT-3.5 Turbo from model dropdown options, replace with Claude models
- [ ] T024 [US5] Delete src/lib/ai/providers.ts — no longer needed (all callers migrated)
- [ ] T025 [US5] Run `bun remove @ai-sdk/openai` to remove the OpenAI SDK package from dependencies
- [ ] T026 [US5] Grep entire src/ directory for any remaining `openai`, `OPEN_AI`, `gpt-` references — fix or remove each one
- [ ] T027 [US5] Run `bun run build` and verify zero errors. Run `bun run lint` and verify zero warnings.

**Checkpoint**: OpenAI fully removed — single AI provider (Anthropic)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories.

- [ ] T028 [P] Update src/lib/ai/chat.ts comments — change "OpenAI-compatible" references to reflect current architecture
- [ ] T029 [P] Update src/lib/composio/tool-catalog.ts — rename `OpenAITool` type and related references to generic names (e.g., `ToolDefinition`)
- [ ] T030 [P] Remove `OPEN_AI_API_KEY` from any .env.example, documentation, or CLAUDE.md references
- [ ] T031 Full Playwright regression: test chat streaming, brand DNA onboarding, campaign generation, Composio connection
- [ ] T032 Verify `bun run build` passes, all 955+ tests pass, zero OpenAI references remain in src/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately
- **Phase 2 (US1 - Brand DNA)**: Depends on Phase 1 completion
- **Phase 3 (US2 - Campaigns)**: Depends on Phase 1 completion (can run in parallel with Phase 2)
- **Phase 4 (US3 - Assets/Emails)**: Depends on Phase 1 completion (can run in parallel with Phase 2/3)
- **Phase 5 (US4 - Follow-ups)**: Independent of other stories (can run after Phase 1)
- **Phase 6 (US5 - Workflows/Cleanup)**: Should run LAST — removes OpenAI, requires all generators migrated
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Brand DNA)**: Can start after Phase 1 — no dependencies on other stories
- **US2 (Campaigns)**: Can start after Phase 1 — no dependencies on other stories
- **US3 (Assets/Emails)**: Can start after Phase 1 — no dependencies on other stories
- **US4 (Follow-ups)**: Can start after Phase 1 — no dependencies on other stories
- **US5 (Workflows/Cleanup)**: Should run after US1-US4 — removes shared OpenAI infrastructure

### Within Each User Story

- Migrate generator function first
- Update callers to pass `teamId`
- Validate via Playwright or manual test

### Parallel Opportunities

- T001 + nothing (sequential — extracts from existing file)
- T003 + T004 cannot be parallel (same file)
- T008, T009, T010, T011 are sequential (same file, different functions)
- T012 can run in parallel with T008-T011 (different file)
- T015 + T016 can run in parallel (different files)
- T021 + T022 + T023 can run in parallel (different files)
- T028 + T029 + T030 can run in parallel (different files)

---

## Parallel Example: Phase 3 (Campaigns)

```
# Sequential (same file — seasonal-campaign-generator.ts):
T008 → T009 → T010 → T011

# In parallel with the above (different file):
T012 (store-visual-analyzer.ts)

# After both complete:
T013 (update callers)
T014 (Playwright validation)
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 Only)

1. Complete Phase 1: Internal Agent Client
2. Complete Phase 2: Brand DNA migration
3. **STOP and VALIDATE**: Test brand DNA analysis through the Agent
4. If working → continue to Phases 3-7

### Incremental Delivery

1. Phase 1 → Agent client ready
2. Phase 2 → Brand DNA works through Agent (MVP!)
3. Phase 3 → Campaigns work through Agent
4. Phase 4 → Assets/emails work through Agent
5. Phase 5 → Follow-ups cleaned up
6. Phase 6 → OpenAI removed entirely
7. Phase 7 → Polish and regression testing

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- The `teamId` parameter threading is the main cross-cutting concern — each generator needs its callers updated
- `askAgentJSON` handles structured output via prompt engineering + Zod validation — no `generateObject` equivalent needed
