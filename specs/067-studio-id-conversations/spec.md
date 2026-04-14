# Spec 067 — Studio as the Task Runtime: Per-Task Conversations + Tool Migration from /chat

**Feature Branch**: `066-studio-chat-replacement` (continues from spec 066)
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "o studio tem que ser separado por task, a pagina task precisa mostrar todas as tasks, as ferramentas devem ser transferidas para o chat do studio"

---

## Context

Studio replaces `/chat` and `/chat/task/[id]` as the runtime for ALL conversational work in Snew. The goal is NOT to add a parallel system — it is to **move** the task/conversation infrastructure that `/chat` uses today into `/studio`, one-to-one:

- Every task is addressable at `/studio/create/[id]` (previously `/chat/task/[id]`).
- The existing `/tarefas` page continues to list **every** task — nothing about that list changes; what changes is that clicking an item opens it in studio, not in the old chat.
- The tool/skill catalog currently wired into `/chat` (SNEW*CONNECT_APP, STORE_QUERY*\*, SNEW_RUN_SKILL, seasonal-calendar, copywriter, brand-dna, …) **moves** into the studio chat panel. It is not duplicated in two places — studio becomes the single surface.
- The legacy `/chat`, `/chat/[id]`, `/chat/task/[id]` routes redirect into studio.

### Audited state (source of truth)

| Surface                     | Today                                                                                                                                                                                               | After spec 067                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| New conversation entry      | `/chat` (redirect to /dashboard) + old chat flow                                                                                                                                                    | `/studio/create` (no id)                                                         |
| Per-task URL                | `/chat/task/[id]`                                                                                                                                                                                   | `/studio/create/[id]`                                                            |
| Master task list            | `/tarefas` (`task-list.tsx`)                                                                                                                                                                        | `/tarefas` (unchanged — shows ALL tasks regardless of origin)                    |
| Chat engine                 | `/api/chat` → messages-api or managed-agents (spec 063), with skill mode + tools                                                                                                                    | Same engine; studio chat panel POSTs to `/api/chat`                              |
| Tools available in chat     | SNEW*CONNECT_APP, SNEW_CHECK_CONNECTIONS, SNEW_LIST_AVAILABLE_APPS, SNEW_CREATE_NOTIFICATION, STORE_QUERY*\* + MCP tools (SNEW_LIST_SKILLS, SNEW_RUN_SKILL, SNEW_MODIFY_ARTIFACT, SNEW_QUERY_STORE) | Same tools, **invoked from studio chat**                                         |
| Artifact rendering          | `ArtifactRenderer` + `ArtifactPanel` / `ArtifactPanelShell` (spec 055)                                                                                                                              | Same renderer, embedded inside studio (drawer or side panel)                     |
| DB schema                   | `tasks` + `conversations` + `conversation_messages` (unchanged)                                                                                                                                     | Unchanged                                                                        |
| `studio-chat` edge function | fast canvas mutations (`set_heading`, `generate_image`, `set_style`, …)                                                                                                                             | Remains — canvas mutations stay here. Skill & tool calls go through `/api/chat`. |
| Sidebar / list UI           | `task-list.tsx` at `/tarefas`                                                                                                                                                                       | Same. No new sidebar. Clicking a task routes to `/studio/create/[id]`.           |

### What changes, in one paragraph

Every task — old or new, chat-origin or studio-origin — is opened inside `/studio/create/[id]`. The studio chat panel is plumbed into `/api/chat` and gains all tools/skills chat had. Canvas-specific actions (position, overlay, font, image generate) stay on the `studio-chat` edge function for latency. `/chat*` routes redirect. `/tarefas` keeps its list — it already shows all tasks.

---

## User Scenarios & Testing

### User Story 1 — Every task opens inside studio (P1)

**As a Snew user**, when I click any task in `/tarefas` — including tasks created before spec 067 — it opens in `/studio/create/[id]`. The studio loads the conversation history, the artifact, and the canvas (if applicable) from Supabase.

**Why this priority**: this is the cutover. Without it, studio is a dead-end that doesn't inherit existing work.

**Independent Test**: from a seeded DB with 5 old chat tasks and 0 studio tasks, open `/tarefas`, click any task, verify the URL is `/studio/create/<id>`, the chat messages and artifact are identical to what `/chat/task/<id>` used to show.

**Acceptance Scenarios**:

1. **Given** a task with id X exists (created via legacy chat flow), **When** I visit `/studio/create/X`, **Then** the page server-fetches the task, the conversation, and the last 50 `conversation_messages`; the chat panel renders them; the artifact (if any) renders in the artifact panel.
2. **Given** I navigate to `/chat/task/X`, **When** the page loads, **Then** I am redirected to `/studio/create/X` with no intermediate flash.
3. **Given** `/tarefas` lists task X, **When** I click the row, **Then** the navigation target is `/studio/create/X`.

---

### User Story 2 — New conversations start in studio and become tasks (P1)

**As a user**, I open `/studio/create` (no id), type a message, and a task is created atomically. The URL is replaced with `/studio/create/<new-id>`. The task immediately appears in `/tarefas`.

**Why this priority**: unless new tasks land in the same table the list reads from, `/tarefas` won't show them, breaking story 1.

**Independent Test**: from `/studio/create`, send a first message, inspect the DB — a new row in `tasks` + one in `conversations` + two in `conversation_messages` (user + assistant). `/tarefas` reflects it without a hard refresh.

**Acceptance Scenarios**:

1. **Given** I'm at `/studio/create` (no id), **When** I send a message, **Then** the client calls `POST /api/studio/session` which runs `create_task_with_conversation` RPC and returns `{ taskId, conversationId }`; the URL is `router.replace`'d to `/studio/create/<taskId>`.
2. **Given** the new task exists, **When** `/tarefas` is open in another tab with React Query / SWR live, **Then** the task appears at the top of the list within the normal refetch interval.
3. **Given** the user hits `/studio/create` and navigates away without sending, **Then** no task row is created (lazy creation).

---

### User Story 3 — Tools and skills from /chat work inside studio chat (P1)

**As a user**, when I type "conecta meu Instagram" or "quanto vendi ontem" or "criar calendário de setembro" inside studio chat, the correct tool/skill runs — via the same `/api/chat` pipeline today's chat uses. The tool output streams inline in the studio chat panel; the artifact (if any) renders in the studio artifact panel.

**Why this priority**: moving tools into studio is the second half of the replacement. Without it, studio can only do canvas work and users must still open the old chat for everything else.

**Independent Test**: inside `/studio/create/[id]`, invoke each of these tools and verify equivalent behaviour to what `/chat` does today: SNEW_CONNECT_APP (Instagram), STORE_QUERY_SALES, STORE_QUERY_STOCK, SNEW_RUN_SKILL (seasonal-calendar), SNEW_MODIFY_ARTIFACT.

**Acceptance Scenarios**:

1. **Given** a user prompt that matches the skill detector (e.g., "calendário sazonal"), **When** I send it inside studio chat, **Then** the client POSTs `/api/chat` with `{ skill_slug: 'seasonal-calendar', taskId, conversationId, message }` and the response stream is rendered in studio exactly as in chat.
2. **Given** a user prompt that requires tool calls (e.g., "conecte meu Instagram"), **When** streamed, **Then** the tool call events (`tool-input-*`, `tool-output-available`) are consumed by the studio chat UI and rendered with the same bubble components the chat uses (copied or reused).
3. **Given** a tool returns an artifact, **When** persisted via `saveArtifact()`, **Then** studio's artifact panel re-renders using `ArtifactRenderer` with the new data.
4. **Given** the same tool runs in `/chat/task/<id>` AND in `/studio/create/<id>` for two different tasks, **When** comparing the DB rows produced, **Then** they are identical in schema and contents.

---

### User Story 4 — Canvas mutations remain fast and separate (P1)

**As a user**, when I ask for small canvas tweaks ("deixa o texto mais escuro", "troca a fonte", "gera outra imagem"), the response is sub-second. This must not regress when tools/skills are added to studio.

**Why this priority**: studio's value proposition is speed. Routing every message through `/api/chat` would add latency. The dual-path (studio-chat for canvas, /api/chat for tools/skills) stays.

**Independent Test**: measure p50 latency of "trocar fonte" before and after spec 067 — must remain within 10% of the pre-067 baseline.

**Acceptance Scenarios**:

1. **Given** a canvas-only request, **When** the client classifies it (via the existing studio-chat prompt heuristics or a lightweight client check), **Then** it goes through `studio-chat` edge function, NOT `/api/chat`.
2. **Given** the canvas-only response lands, **When** applying actions, **Then** both the user and assistant messages are persisted to `conversation_messages` (the persistence layer is NOT skipped just because the engine is different).
3. **Given** a tool/skill request, **When** detected, **Then** it goes through `/api/chat` (FR-007).

---

### User Story 5 — Legacy /chat routes redirect cleanly (P1)

**As a user with bookmarks or links to `/chat`, `/chat/[id]`, or `/chat/task/[id]`**, every legacy URL redirects to the studio equivalent without data loss, without an error page, and without a flash.

**Why this priority**: users and integrations have existing URLs; breaking them is user-hostile.

**Independent Test**: for each of 3 canonical legacy URLs, verify: (a) server-side redirect (301) to `/studio*`, (b) URL in the address bar is the studio one after load, (c) no 404, no render of the legacy component, (d) state identical to pre-067.

**Acceptance Scenarios**:

1. `/chat` → `/studio/create` (server redirect).
2. `/chat/[id]` → `/studio/create/[id]` (server redirect).
3. `/chat/task/[id]` → `/studio/create/[id]` (server redirect).
4. Any sidebar / widget / dashboard card referencing `/chat*` is updated to `/studio*`.

---

### User Story 6 — `/tarefas` still lists every task (P1, non-regression)

**As a user**, `/tarefas` continues to show every task for my team, regardless of whether it started in chat or studio. Clicking a task opens it in studio.

**Why this priority**: the user explicitly asked that the tasks page continue to show everything.

**Independent Test**: with a mix of 5 legacy chat tasks and 5 new studio tasks, `/tarefas` shows all 10. Task row shape (title, skill, status, created_at) is identical for both.

**Acceptance Scenarios**:

1. **Given** my team has N tasks of any origin, **When** I open `/tarefas`, **Then** all N are listed and sortable/filterable like today.
2. **Given** I click a task, **When** navigation happens, **Then** the target is `/studio/create/<id>`.
3. **Given** a task has an artifact of type `seasonal-calendar` (non-studio-origin), **When** opened inside studio, **Then** the artifact renders in studio's artifact panel using the shared `ArtifactRenderer`.

---

### Edge Cases

- **Task has no canvas data** (chat-origin task with text-only artifact): studio opens with an empty canvas and the artifact panel visible; the canvas does not block the page.
- **Task has a canvas state but was created pre-067** (not possible yet, but for safety): if `artifact_data` is missing the canvas fields, studio starts the canvas empty and the user can rebuild.
- **Skill fails mid-run**: same behaviour as chat today — `skill_status='failed'`, error shown in artifact panel, chat continues.
- **User edits canvas, then asks a skill question**: the skill runs inline; the canvas stays. The task retains both the canvas artifact (if any) AND the skill artifact. See Open Question #2.
- **Conversation with > 50 messages**: server-side pagination; studio loads the last 50 on mount, with "load older" affordance.

---

## Requirements

### Functional Requirements

**Routing**

- **FR-001**: Create `src/app/(dashboard)/studio/create/[id]/page.tsx` — server component. Mirror the logic of `src/app/(dashboard)/chat/task/[id]/page.tsx` (auth, team check, task fetch, initial messages fetch), but render `<StudioTaskClient task conversationId initialMessages />` instead of `<TaskPageClient>`.
- **FR-002**: Keep `src/app/(dashboard)/studio/create/page.tsx` (no id) for new sessions. On first message send, call `POST /api/studio/session` → receive `{ taskId, conversationId }` → `router.replace('/studio/create/<taskId>')`.
- **FR-003**: Replace contents of `src/app/(dashboard)/chat/page.tsx` with `redirect('/studio/create')`.
- **FR-004**: Replace contents of `src/app/(dashboard)/chat/[id]/page.tsx` with `redirect('/studio/create/<id>')`.
- **FR-005**: Replace contents of `src/app/(dashboard)/chat/task/[id]/page.tsx` with `redirect('/studio/create/<id>')`.

**Task creation API**

- **FR-006**: Create `POST /api/studio/session` at `src/app/api/studio/session/route.ts`. Accepts `{ initial_message?: string, skill_slug?: string }`. Calls the existing RPC `create_task_with_conversation` and returns `{ taskId, conversationId }`. Sets `tasks.active_skill` = `skill_slug` when provided, else leaves null.

**Persistence**

- **FR-007**: Split `StudioChatPanel.tsx` submit handler by **route**, not by task:
  - If the message is a **canvas action** → `supabase.functions.invoke("studio-chat", …)`, then persist user + assistant messages to `conversation_messages`.
  - If the message is a **tool/skill invocation** → POST `/api/chat` with `{ taskId, conversationId, message, skill_slug? }`. Stream the response with the existing SSE reader (the same one `useOrchestratorChat` uses). `/api/chat` already persists the messages; do not double-write.
- **FR-008**: Classification of canvas vs tool/skill happens client-side with a thin heuristic:
  - If the user prompt matches `skill-detector` patterns → skill mode.
  - If the user clicks a skill chip / tool chip → skill mode.
  - Otherwise → canvas mode (default).
  - The heuristic is conservative: false negatives (skill treated as canvas) are recoverable via studio-chat's existing `studio-chat` system prompt returning `{ actions: [{ type: 'run_skill', slug: ... }] }` — the client then re-POSTs to `/api/chat`.
- **FR-009**: Every canvas turn writes a **debounced snapshot** of the creative state to `tasks.artifact_data` (via `PATCH /api/tasks/<id>`). Debounce 500ms. Final write on `beforeunload`.
- **FR-010**: The `StudioTaskClient` component receives `initialMessages` server-side; after mount it is the single source of truth for message display. Subsequent messages come from the SSE stream or the studio-chat direct response.

**Tools and skills inside studio**

- **FR-011**: Bring every chat tool into studio. That means importing `src/lib/chat/tool-definitions.ts` and the MCP tool wiring (`supabase/functions/mcp-tools/index.ts`) works unchanged — because studio now goes through `/api/chat`, the tools are available for free.
- **FR-012**: Bring the skill chip UI into studio chat. The chips already exist in the chat interface (`src/components/chat/**`). Studio reuses them by importing or copying the component under `src/components/asset-studio/SkillChips.tsx` and placing it above or inside the StudioChatPanel composer.
- **FR-013**: Bring the artifact renderer into studio. `src/components/chat/artifact-panel.tsx` + `artifact-panel-shell.tsx` are embedded inside the studio layout as a right-hand slide-over or drawer, triggered when a task has `artifact_type != null`. For `artifact_type === 'studio-asset'` (canvas-only tasks), the canvas is the artifact — no separate panel.

**Artifact schema**

- **FR-014**: Define (and commit) `src/lib/studio/artifact-schema.ts` with a Zod schema for the canvas state:
  ```ts
  export const StudioAssetSchema = z.object({
    heading: z.string(),
    description: z.string(),
    cta: z.string(),
    textColor: z.string(),
    ctaColor: z.string(),
    font: z.string(),
    overlayOpacity: z.number(),
    overlayColor: z.string().optional(),
    overlayType: z.enum(['solid', 'gradient-bottom', 'gradient-top', 'vignette']).optional(),
    activeImageUrl: z.string().nullable(),
    imageFit: z.enum(['cover', 'contain']),
    imagePosition: z.object({ x: z.number(), y: z.number() }),
    imageScale: z.number(),
    style: z.string().nullable(),
    styleId: z.string().nullable(),
    channel: z.string(),
    product: z.string(),
    productImageUrl: z.string().nullable(),
    referenceImages: z.array(
      z.object({ id: z.string(), url: z.string(), weight: z.number().optional() })
    ),
    freeTextBoxes: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        position: z.object({ x: z.number(), y: z.number() }),
      })
    ),
    isCarouselMode: z.boolean(),
    carouselSlides: z.array(z.object({ imageUrl: z.string(), prompt: z.string() })).optional(),
    version: z.literal(1),
  })
  ```
- **FR-015**: When writing `artifact_data` for a studio-origin task, set `artifact_type = 'studio-asset'`. When the same task runs a skill that produces its own artifact, the skill's artifact REPLACES `artifact_type` and `artifact_data` — but the canvas state is preserved in a sibling column `canvas_state` OR the old artifact is archived in `skill_executions.result`. **See Open Question #2**.

**Legacy redirects + cleanup**

- **FR-016**: Audit all `src/components/**` for links/hrefs to `/chat*` and update to `/studio*`. Includes: sidebar, dashboard widgets, notifications, onboarding, etc. The final audit reports zero remaining `/chat` hrefs.
- **FR-017**: Update `/tarefas/task-list.tsx` click handler to navigate to `/studio/create/<id>` instead of `/chat/task/<id>`.
- **FR-018**: Keep legacy chat components around (`src/components/chat/**`) but stop routing new traffic to them — they become the source for shared pieces (artifact renderer, skill chips, tool bubbles) that studio imports.

**`/tarefas` non-regression**

- **FR-019**: `src/app/(dashboard)/tarefas/task-list.tsx` continues to query all tasks for the team, sorted by created_at desc, with no filter by origin. Visual presentation unchanged.

**Observability**

- **FR-020**: Emit:
  - `studio.session.open` `{ taskId, origin: 'tarefas'|'direct'|'new' }`
  - `studio.message.send` `{ mode: 'canvas'|'skill', taskId }`
  - `studio.canvas.snapshot` `{ taskId, bytes, durationMs }`
  - `studio.tool.invoke` `{ toolName, taskId, durationMs }`
  - `studio.legacy.redirect` `{ from: '/chat'|'/chat/[id]'|'/chat/task/[id]', to: '/studio/create/[id]' }`

### Key Entities

- **Task** (existing `tasks` row): unchanged schema; studio writes canvas state into `artifact_data` with `artifact_type='studio-asset'`.
- **Conversation** (existing `conversations` row): unchanged.
- **ConversationMessage** (existing row): canvas turns carry `metadata = { engine: 'studio-chat', actions, durationMs }`; tool/skill turns carry the engine's existing metadata shape.
- **StudioCanvasSnapshot** (derived from task.artifact_data + StudioAssetSchema): the serialized canvas, versioned so future migrations are tractable.

---

## Success Criteria

- **SC-001**: All legacy `/chat*` URLs redirect to `/studio*` with no 404s or hydration flashes (verified via Playwright).
- **SC-002**: Every task from `/tarefas` (legacy or new) opens inside studio with its conversation history intact.
- **SC-003**: Every chat tool (SNEW*CONNECT_APP, STORE_QUERY*\*, SNEW_RUN_SKILL, SNEW_MODIFY_ARTIFACT, …) functions identically inside studio; parity tested by invoking each from inside `/studio/create/<id>` and comparing DB-written rows to pre-067 baseline.
- **SC-004**: p50 latency of canvas-only turns stays within 10% of the spec-066 baseline; p50 latency of skill turns stays within 15% of chat baseline.
- **SC-005**: Zero rows in `conversation_messages` are written twice after spec 067 (no double-persist when engine is `/api/chat`).
- **SC-006**: `grep -r '/chat' src/` shows only comments, tests, or links to docs — no live routing.
- **SC-007**: After 7 days post-deploy, the old `studio-chat`-only path still returns < 1s p95.

## Open Questions / Clarifications

1. **[NEEDS CLARIFICATION]**: When a task that has a canvas (`artifact_type='studio-asset'`) runs a skill that also produces an artifact (e.g., seasonal-calendar), does the skill artifact **replace** `artifact_data` or are both preserved? Options:
   - (a) Replace: `artifact_type` flips to the skill's type; canvas state is lost/archived.
   - (b) Add a `canvas_state` column separate from `artifact_data`; both persist.
   - (c) Spawn a child task with `parent_task_id` for the skill.
   - **Recommendation**: (b) — new migration `add_canvas_state_to_tasks`.
2. **[NEEDS CLARIFICATION]**: Does `/chat` redirect to `/studio/create` (new session) or `/studio` (landing)? **Recommendation**: `/studio/create` — preserves the "new conversation" semantics.
3. **[NEEDS CLARIFICATION]**: Does `/tarefas` keep the same filter UI, or do we add a filter for "studio vs text-only" tasks? **Recommendation**: no new filter; all tasks are equal citizens.
4. **[NEEDS CLARIFICATION]**: When a chat-origin task (text-only) is opened in studio, is the canvas hidden or shown empty with "no image yet" state? **Recommendation**: shown empty — the canvas is always available and the user can generate an image on top of the existing conversation.
5. **[NEEDS CLARIFICATION]**: Do we delete `/chat*` route files or keep them as redirects forever? **Recommendation**: keep as 1-line redirect files for 2 releases, then delete.
6. **[NEEDS CLARIFICATION]**: The messages-api engine uses prompt caching with a fixed system prompt. Adding studio-specific context might reset the cache. Does the chat's system prompt already include what studio needs, or do we need a studio-aware branch? **Recommendation**: start by using the chat system prompt unchanged; add a `mode` flag only if drift appears.

## Out of Scope

- Rewriting `/api/chat` (spec 063 already covers it).
- Redesigning `/tarefas` list (non-regression only).
- Collaborative / multi-user editing.
- Sidebar for studio sessions — there is no separate sidebar; `/tarefas` is the sidebar.
- Deleting the `studio-chat` edge function (kept for canvas speed).
- Replacing `ArtifactRenderer` (reused).

## Dependencies

- Spec 066 (Studio port) — foundation.
- Spec 063 (Hybrid Chat API) — `/api/chat` is the engine.
- Spec 055 (Chat Dynamic Artifacts) — ArtifactRenderer.
- Spec 058 (MCP Tools) — tool catalog.
- RPC `create_task_with_conversation` (migration `20260401010000`).

## Risk Register

| Risk                                                                                      | Severity | Mitigation                                                                       |
| ----------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Studio regresses chat flows users depend on (connect-app, store queries).                 | High     | Parity tests (SC-003); gradual rollout: redirect behind feature flag first week. |
| Canvas latency increases if studio incorrectly routes canvas messages to /api/chat.       | High     | Explicit client-side classifier with conservative defaults (FR-008).             |
| Artifact collision between canvas + skill artifacts.                                      | High     | Open Question #1 must be decided before implementation.                          |
| Legacy URL redirect breaks SEO / integrations.                                            | Low      | 301 redirects, documented in CHANGELOG.                                          |
| Double-writes to `conversation_messages` if studio persists when `/api/chat` already did. | Medium   | FR-010 single source of truth; regression test.                                  |
| Users lose canvas mid-session because snapshot wasn't flushed.                            | Medium   | beforeunload flush + 500ms debounce.                                             |

## Implementation Phases (detailed in tasks.md)

1. **Phase 0 — Scaffolding**
   - `POST /api/studio/session`.
   - `src/app/(dashboard)/studio/create/[id]/page.tsx` (server component mirroring chat/task/[id]).
   - `StudioTaskClient` wrapper that injects task + initialMessages into AssetCreatorModal.
2. **Phase 1 — Persistence**
   - Persist canvas turns to `conversation_messages` after each studio-chat reply.
   - Debounced snapshot of canvas state to `tasks.artifact_data`.
   - Reload canvas from snapshot on mount.
3. **Phase 2 — Tool/skill plumbing**
   - Client classifier (canvas vs tool/skill).
   - SSE reader for `/api/chat` responses inside studio chat.
   - Skill chips component (reused from chat) above composer.
   - Tool result bubble rendering (reused from chat) in studio chat panel.
4. **Phase 3 — Artifact panel**
   - Embed `ArtifactPanelShell` inside studio layout.
   - Toggle visibility by `artifact_type !== 'studio-asset'`.
5. **Phase 4 — Legacy redirects + link rewrites**
   - Redirect files for `/chat`, `/chat/[id]`, `/chat/task/[id]`.
   - `/tarefas/task-list.tsx` href update.
   - Audit every sidebar / widget for `/chat` links.
6. **Phase 5 — Open Question #1 resolution + canvas_state migration (if chosen)**
   - DB migration `add_canvas_state_to_tasks.sql`.
   - Client writes canvas to `canvas_state` alongside `artifact_data`.
7. **Phase 6 — Observability + docs**
   - FR-020 events.
   - Update CLAUDE.md with new flows.
