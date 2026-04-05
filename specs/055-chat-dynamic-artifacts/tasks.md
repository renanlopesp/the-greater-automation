# Tasks: Chat Dynamic Artifacts

**Input**: Design documents from `/specs/055-chat-dynamic-artifacts/`

---

## Phase 1: Foundational — Artifact Component

- [ ] T001 Create `ChatDataArtifact` component in `src/components/chat/artifacts/chat-data-artifact.tsx` with 4 renderers: SalesSummary, ProductTable, OrderList, MetricCard
- [ ] T002 Add `'chat-data'` case to the artifact type switch in `src/components/chat/artifact-renderer.tsx`

---

## Phase 2: AI Integration — System Prompt + Tool

- [ ] T003 Update system prompt in `src/app/api/chat/route.ts` to instruct AI to call SNEW_MODIFY_ARTIFACT after retail tool calls with chat-data artifact payload
- [ ] T004 Update SNEW_MODIFY_ARTIFACT in `src/lib/ai/platform-tools.ts` to support `artifact_type: 'chat-data'` and set `skill_status: 'completed'`

---

## Phase 3: Polish

- [ ] T005 Run `bun run build` to verify zero errors
- [ ] T006 Visual verification via Playwright

---

## Notes

- Total: 6 tasks
- 1 new file, 3 modified files
- No new API routes, no DB changes
