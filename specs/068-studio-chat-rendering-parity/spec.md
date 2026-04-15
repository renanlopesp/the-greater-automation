# Spec 068 — Studio Chat Rendering Parity (REUSE, don't rebuild)

**Feature Branch**: `066-studio-chat-replacement`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User feedback (screenshot): "`<!-- snew:followups -->` marker leaked into the bubble; markdown not rendered; pasted image URLs shown as plain text; 'Referência de imagens' + 'Produto' chips always visible instead of contextual; studio has no generic file upload; generated images don't use the chat's asset showcase."

User directive: **"verifique os componentes disponíveis para esse chat antes de sair criando qualquer coisa nova"** → this spec MUST reuse existing chat components; it does NOT create parallel implementations.

---

## Context — Existing assets we will REUSE

Audited 2026-04-14. Everything below already exists in the relay codebase and must be used as-is:

| Concern                                                                                                        | Existing component / util — REUSE                                                                              | Path                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Strip `<!-- snew:followups / coworker / artifact -->` markers from assistant text + extract structured payload | `parseOrchestratorResponse()`                                                                                  | `src/lib/chat/parse-orchestrator-response.ts`                                                |
| Render assistant markdown (p / ul / ol / strong / code / pre)                                                  | `ChatMessageBubble` (ReactMarkdown w/ custom components) OR `MessageResponse` (Streamdown w/ CJK/math/mermaid) | `src/components/chat/chat-message-bubble.tsx`, `src/components/ai-elements/message.tsx`      |
| Render follow-up chips below assistant turn                                                                    | `FollowUpSuggestions`                                                                                          | `src/components/chat/follow-up-suggestions.tsx`                                              |
| Upload a file to `chat-uploads` bucket + get a public URL                                                      | `uploadChatFileAction()` (server action)                                                                       | `src/lib/actions/chat-upload.ts`                                                             |
| Chat composer with paperclip + pending file previews + drag/drop + upload progress                             | `OrchestratorChatWrapper` (composer portion, lines ~555-619)                                                   | `src/components/chat/orchestrator-chat-wrapper.tsx`                                          |
| Render an artifact (seasonal-calendar, chat-data, approval, generic)                                           | `ArtifactRenderer`                                                                                             | `src/components/chat/artifact-renderer.tsx` (+ artifact-panel.tsx, artifact-panel-shell.tsx) |
| Render a coworker suggestion card                                                                              | `CoworkerSuggestionCard`                                                                                       | `src/components/chat/coworker-suggestion-card.tsx`                                           |
| Typing indicator while streaming                                                                               | `TypingIndicator`                                                                                              | `src/components/chat/typing-indicator.tsx`                                                   |

The studio chat panel (`src/components/asset-studio/StudioChatPanel.tsx`, 1632 lines) currently **duplicates none of these** — it renders `<p>{content}</p>` directly, which is why the markers leak, markdown is flat, URLs don't preview, and so on.

---

## User Scenarios & Testing

### User Story 1 — Assistant messages render like chat (P1)

**As a user in `/studio/create/[id]`**, every assistant message renders with the same markdown quality, marker stripping, and follow-up chips as `/chat`. No `<!-- snew:* -->` comment leaks into the bubble; bolds are bold; lists are lists; follow-up chips appear below the message as clickable chips.

**Why this priority**: the screenshot shows the marker leak is the #1 visible regression.

**Independent Test**: send a studio prompt that returns `"resposta com **negrito** e <!-- snew:followups ['a','b'] -->"`. The bubble shows "resposta com **negrito**" with real bold typography and two chips labelled "a" and "b" below.

**Acceptance Scenarios**:

1. **Given** an assistant message with `<!-- snew:followups [...] -->`, **When** rendered in studio, **Then** the visible text contains no HTML comment AND chips are rendered by `FollowUpSuggestions`.
2. **Given** an assistant message with markdown (`**bold**`, `- item`, `\`\`\`code\`\`\``), **When** rendered, **Then** formatting matches chat's output byte-for-byte in the DOM.
3. **Given** a pasted image URL matching `https://…\.(jpe?g|png|webp|gif|svg)`, **When** present in text, **Then** a preview `<img>` is rendered inline (max-width 240) below the text.

---

### User Story 2 — Generic file upload inside studio chat (P1)

**As a user**, the studio chat composer has a paperclip button that opens a file picker, accepts images/PDFs/txt/csv/json, uploads via `uploadChatFileAction`, shows pending-file previews, and on send appends the file URLs to the message as the chat convention (`[Arquivos anexados — URLs públicas]\n<url>`).

**Why this priority**: studio today has zero generic upload. Users only see the specialized "Referência de imagens" + "Produto" affordances — which is wrong for many use cases (paste a PDF brief, a CSV, a screenshot for the AI to see).

**Independent Test**: click paperclip → pick a PNG → it appears as pending thumbnail → click send → message appears in chat with the URL; AI reply mentions the file.

**Acceptance Scenarios**:

1. **Given** the studio composer, **When** I click the paperclip, **Then** a hidden `<input type="file" accept="image/*,.pdf,.txt,.csv,.json">` opens; picking a file adds it to `pendingFiles` state.
2. **Given** 1+ pending files, **When** I send, **Then** each file is uploaded via `uploadChatFileAction`, URLs are appended to the message body as `\n[Arquivos anexados — URLs públicas]\n${url1}\n${url2}`, and the pending list clears.
3. **Given** the upload fails, **When** sending, **Then** the client falls back to data URLs like orchestrator-chat-wrapper does.

---

### User Story 3 — Contextual "Referência de imagens" + "Produto" buttons (P1)

**As a user**, the two specialized buttons show ONLY when I'm actively doing image/video work in studio — not permanently. When I'm chatting about text, copy, or asking questions, these buttons are hidden.

**Why this priority**: permanent visibility clutters the composer and misleads users into thinking every message must attach a product.

**Independent Test**: open studio with no channel selected → buttons hidden. Run `generate_image` or set a channel/style → buttons appear. Ask a text-only question → buttons hide again (or stay until explicit dismiss — see OQ#1).

**Acceptance Scenarios**:

1. **Given** `creativeState.channel === null` AND `creativeState.style === null` AND no image intent action in the last N messages, **When** rendering the composer, **Then** the two buttons are hidden.
2. **Given** the last assistant action was `generate_image | generate_carousel | generate_video | set_style | set_channel`, **When** rendering, **Then** the buttons are visible.
3. **Given** the user picks a skill chip like "calendário sazonal" (non-visual), **When** rendering, **Then** the buttons hide for this turn.

---

### User Story 4 — Generated-asset showcase inside studio chat (P1)

**As a user**, when the studio generates an image (single or carousel), that asset is rendered in the chat using the same "mostruário/asset showcase" pattern chat uses — not as a loose URL in the bubble.

**Why this priority**: today studio's generated image lands on the canvas only; in the chat thread it appears as a URL fragment or an activity card. The user wants the nicer chat asset card.

**Independent Test**: trigger `generate_image` → assistant message contains a card with image thumbnail, prompt summary, and primary actions (Use in canvas, Regenerate, Share) — identical to chat's asset card component.

**Acceptance Scenarios**:

1. **Given** a studio `generate_image` action succeeds, **When** the assistant message is appended, **Then** the message renders the chat's asset/thumbnail card component (not a raw URL, not only an activity card).
2. **Given** the user clicks "Use in canvas", **When** the handler fires, **Then** the image becomes the `activeImageUrl` in creativeState.
3. **Given** a carousel generation, **When** complete, **Then** the asset card shows all slides with navigation.

---

### User Story 5 — Artifact panel inside studio for non-canvas artifacts (P2)

**As a user**, when a skill running inside studio produces a non-canvas artifact (seasonal-calendar, chat-data, approval), the artifact renders in a side panel using `ArtifactRenderer` — the same renderer chat uses.

**Why this priority**: covered by spec 067 FR-012; restated here to confirm no custom renderer is built.

**Independent Test**: from studio, invoke seasonal-calendar skill → artifact panel slides in on the right with the same calendar grid chat shows.

**Acceptance Scenarios**:

1. **Given** a task with `artifact_type='seasonal-calendar'`, **When** opened in studio, **Then** `<ArtifactRenderer artifactType artifactData taskId />` renders inside a right-hand panel.
2. **Given** the task is also a studio-asset task, **When** rendering, **Then** the canvas stays visible; the skill artifact is a sibling panel (not overlay).

---

### Edge Cases

- **Massive markdown** (huge lists, code blocks): use `Streamdown` path if chat does for that route; else `ReactMarkdown` from chat-message-bubble. Do NOT write a third renderer.
- **Stream in progress**: marker stripping must handle partial `<!-- snew:followups [...` before the closing `-->`. Rely on `parseOrchestratorResponse` which already handles this.
- **Inline image URL that is NOT an asset**: render as normal markdown link, not forced `<img>`. Discriminate via file extension regex.
- **Pasting a file during a canvas intent**: the file still uploads via paperclip; "Referência de imagem" is a distinct upload slot (bound to `gemini-generate` reference payload) and stays specialized.
- **Studio composer in agentMode** (document generation): follow chat conventions entirely; both buttons hide (already the case today).
- **Legacy canvas-only tasks without conversationId** (e.g., studio used from home w/o task id): rendering still works — `parseOrchestratorResponse` is pure; uploads and chips don't need a conversationId.

---

## Requirements

### Functional Requirements — REUSE ONLY

**Rendering (the broken bubble)**

- **FR-001**: In `StudioChatPanel.tsx` replace the `<p style={{ whiteSpace: "pre-wrap" }}>{chatMsg.content}</p>` block (~line 1433) with the chat's existing renderer. Preferred: import `ChatMessageBubble` from `src/components/chat/chat-message-bubble.tsx` and use it for every `ChatMessage` of role `'assistant'`. Fall back to `MessageResponse` from `src/components/ai-elements/message.tsx` if `ChatMessageBubble` proves coupled to chat-only context.
- **FR-002**: Before rendering, pipe `content` through `parseOrchestratorResponse()` from `src/lib/chat/parse-orchestrator-response.ts`. Use the returned `visibleText` for the bubble and the returned `followUps` (and coworker/artifact payloads) to drive downstream components. The raw marker MUST NOT reach the DOM.
- **FR-003**: When `parseOrchestratorResponse` returns `followUps.length > 0` OR the local `chatMsg.followUps` prop is set, render `FollowUpSuggestions` from `src/components/chat/follow-up-suggestions.tsx`. Remove the current inline follow-up chip rendering in StudioChatPanel (~line 1460-1478) — no duplicate component.
- **FR-004**: Detect inline image URLs (`/https?:\/\/[^\s)]+\.(jpe?g|png|webp|gif|svg)/gi`) inside the visible text and render a small preview `<img>` below the markdown block (max-width 240, borderRadius 8). Do not rewrite the markdown; render in parallel. This matches chat's behaviour when assistants paste asset URLs.

**Composer + uploads**

- **FR-005**: Add a paperclip upload button to the studio chat composer by porting the relevant JSX from `OrchestratorChatWrapper` (`src/components/chat/orchestrator-chat-wrapper.tsx` lines ~596-619). Reuse its `pendingFiles` state pattern (thumbnail + name + remove X) at lines ~555-581.
- **FR-006**: Call the existing server action `uploadChatFileAction` from `src/lib/actions/chat-upload.ts` — do NOT create a new upload endpoint. On send, collect uploaded URLs and append to the message body using the canonical pattern: `"\n[Arquivos anexados — URLs públicas]\n" + urls.join("\n")`. Fall back to data URLs on upload failure.
- **FR-007**: Make the paperclip button the primary upload for "general attachments." The existing "Referência de imagens" and "Produto" buttons remain as specialized affordances for canvas generation context — their upload targets differ (reference for AI generation, product for canvas subject).

**Contextual buttons**

- **FR-008**: Gate the "Referência de imagens" + "Produto" buttons on `creativeState`. Show when ALL of:
  - `!agentMode` (document mode always hides), AND
  - `creativeState.channel !== null` OR `creativeState.style !== null` OR the last assistant action was one of `generate_image | generate_carousel | generate_video | set_style | set_channel`.
    Otherwise hide. Track `lastAssistantAction` in local state alongside `messages`. When a new user message arrives or the mode resets, clear the flag.

**Asset showcase for generated images**

- **FR-009**: When rendering an assistant message whose `executedActions` include `{ type: 'generate_image' | 'generate_carousel' }`, render the chat's asset card component (inspect `src/components/chat/artifacts/**`, `src/components/chat/artifact-chip.tsx`, or the image rendering inside the activity message) — whichever the chat currently uses for generated image results. Reuse; don't rebuild.
- **FR-010**: If no chat component exists for a single generated image (verify first), propose reusing `ArtifactRenderer` with a new artifact type `'studio-image'` that expects `{ url, prompt, variants[], channel }`. This is the ONLY place we may add a new renderer case — and it lives inside `artifact-renderer.tsx`, not a parallel file.

**Artifact panel (cross-reference spec 067)**

- **FR-011**: Import `ArtifactPanelShell` + `ArtifactRenderer` into StudioTaskClient or a new layout wrapper so non-canvas artifacts render in a side panel beside AssetCreatorModal. This is also in spec 067 FR-012; this spec's scope is only the rendering mechanics (reuse), not the routing.

### Explicitly OUT of scope

- Building a new markdown renderer — use the chat one.
- Building a new uploader endpoint — use `chat-upload.ts`.
- Building a new follow-up chip component — use `FollowUpSuggestions`.
- Building a new artifact renderer — use `ArtifactRenderer`.
- Modifying the studio-chat edge function — rendering fix is client-side.
- Replacing `AssetCreatorModal`'s internal canvas logic.

### Key Entities

- **DisplayMessage** (existing, `StudioChatPanel.tsx`): gains a derived `visibleText` + `parsedFollowUps` after passing through `parseOrchestratorResponse`.
- **ChatMessage** (existing): unchanged.
- **PendingFile** (new local state in StudioChatPanel): `{ id, file, name, url?, dataUrl?, status: 'uploading' | 'done' | 'error' }`. Mirrors the chat wrapper's local state shape exactly.
- **CreativeState** (existing): add a derived `showReferencePanel: boolean` computed from `channel`, `style`, and `lastAssistantAction`.

---

## Success Criteria

- **SC-001**: No `<!-- snew:` substring appears anywhere in the visible DOM of `/studio/create/[id]`. Verified by Playwright DOM snapshot across 5 canned conversations.
- **SC-002**: 100% of assistant markdown features (bold, italic, lists, code, blockquotes) render identically in studio and `/chat/task/[id]`. DOM-diff test.
- **SC-003**: Follow-up chips render via a single shared component (`FollowUpSuggestions`). `grep -r "follow-up" src/components/asset-studio/` returns no custom chip code after this spec ships.
- **SC-004**: Paperclip upload in studio uses `uploadChatFileAction` (verified by grep for `uploadChatFileAction` import in `StudioChatPanel.tsx`).
- **SC-005**: "Referência de imagens" / "Produto" buttons are hidden on a fresh `/studio/create` load (no channel, no style, no image action yet).
- **SC-006**: A generated image asset in chat renders using the same component chat uses; no custom image-result renderer exists in `src/components/asset-studio/**`.
- **SC-007**: No new file is added under `src/components/asset-studio/` that duplicates an existing chat utility.

## Open Questions / Clarifications

1. **[NEEDS CLARIFICATION]**: Should "Referência de imagens" + "Produto" buttons stay VISIBLE for the whole session once the user has entered image mode once, or toggle OFF as soon as the next message is non-visual? **Recommendation**: once enabled, stay enabled for 5 turns or until canvas is cleared; avoid flicker.
2. **[NEEDS CLARIFICATION]**: `ChatMessageBubble` vs `MessageResponse` — which renderer does studio use? Chat has both; they render different message shapes. **Recommendation**: use `ChatMessageBubble` (ReactMarkdown path) — it's the simpler, Drop-in one; switch to `MessageResponse` only if math/mermaid are needed.
3. **[NEEDS CLARIFICATION]**: Is there already a chat component for rendering a single generated image asset (`generate_image` result)? If yes, which file? If no, confirm we may add an artifact type `'studio-image'` to `artifact-renderer.tsx`.
4. **[NEEDS CLARIFICATION]**: Does studio need the chat's `CoworkerSuggestionCard` (marker `<!-- snew:coworker ... -->`)? Recommendation: yes — `parseOrchestratorResponse` already extracts it; render the existing component.
5. **[NEEDS CLARIFICATION]**: Do we render artifacts inline in the chat thread (activity card style) OR in a side panel? Studio canvas is the primary visual; skill artifacts need space. **Recommendation**: side panel (matches spec 067 FR-011).

## Dependencies

- Spec 066 (studio port) — merged.
- Spec 067 (id-based conversations) — Phase 0 + Phase 1 landed.
- Existing chat infra (spec 063 hybrid chat + spec 055 dynamic artifacts).

## Risk Register

| Risk                                                                                             | Severity | Mitigation                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChatMessageBubble` is coupled to chat-only context (team, user, useChat hook).                  | Medium   | Read the file first; if coupled, fall back to `MessageResponse` from ai-elements which is decoupled.                                                                |
| Paperclip upload + Referência buttons confuse users.                                             | Low      | Tooltips + visual hierarchy: paperclip left of composer, specialized buttons right.                                                                                 |
| Contextual button heuristic too aggressive (hides when user actually wants to attach a product). | Medium   | Add a "+ / more" overflow menu so the buttons are discoverable when hidden.                                                                                         |
| Image URL autodetect produces false positives (e.g., URLs inside code blocks).                   | Low      | Run detector only on the text BETWEEN code blocks (parseOrchestratorResponse already isolates this).                                                                |
| Duplicating the chat composer shape creates drift.                                               | Medium   | Extract the composer JSX into a shared `src/components/chat/chat-composer.tsx` used by both chat wrapper and StudioChatPanel (follow-up work; out of scope for P1). |

## Implementation Phases

1. **Phase 0 — Marker + markdown (P1 MVP)**
   - Wire `parseOrchestratorResponse` into StudioChatPanel's render loop.
   - Replace `<p>` with `ChatMessageBubble` (or `MessageResponse` fallback).
   - Verify markers stop leaking; bold/lists render.
2. **Phase 1 — Follow-ups unification**
   - Replace the inline chip loop with `FollowUpSuggestions`.
3. **Phase 2 — Inline image preview**
   - Add URL-regex detector + inline `<img>` preview in parallel with markdown.
4. **Phase 3 — Paperclip upload**
   - Port composer paperclip + pendingFiles pattern; wire `uploadChatFileAction`.
5. **Phase 4 — Contextual specialty buttons**
   - Compute `showReferencePanel` from `creativeState` + `lastAssistantAction`; wrap the two buttons with this flag.
6. **Phase 5 — Asset showcase for generated images**
   - Reuse chat's image result card; add `studio-image` type to `ArtifactRenderer` only if nothing reusable exists.
7. **Phase 6 — Artifact panel embedding** (cross-ref 067)
   - `ArtifactPanelShell` beside AssetCreatorModal for non-canvas artifacts.
