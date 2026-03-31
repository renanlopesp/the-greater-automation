# Research: Task-Based Architecture

## R1: SNEW_RUN_SKILL currently returns context, not data

**Decision**: Modify `SNEW_RUN_SKILL` to call skill-specific generators when available, instead of just returning skill context.

**Rationale**: The current Phase 0 behavior of `skill-executor.ts` returns `{ skillSlug, skillName, systemPrompt, tools, knowledge }` — the skill's context, not actual data. For the artifact panel to show real deliverables, `SNEW_RUN_SKILL` needs to execute the skill's generator (e.g., `generateCalendar()`) and return structured data.

**Approach**: Add a skill dispatch map in `platform-tools.ts`:

```ts
const SKILL_GENERATORS: Record<
  string,
  (input: unknown, context: SkillContext) => Promise<unknown>
> = {
  'seasonal-calendar': (input) => generateCalendar(input),
  // future skills add entries here
}
```

When `SNEW_RUN_SKILL` is called, check if the skill has a generator. If yes, call it. If no, fall back to Phase 0 context injection.

## R2: Real-time artifact updates

**Decision**: Use React Query polling (2s interval) while task is active, not WebSocket/Realtime.

**Rationale**: Supabase Realtime could work but adds complexity. Polling is simpler and the skill execution is typically 5-15s. Polling at 2s gives good UX without over-engineering. Can switch to Realtime later if needed.

**Alternatives considered**:

- Supabase Realtime subscription → more complex setup, overkill for single-value updates
- Server-sent events → requires custom endpoint
- Return artifact in the chat stream itself → mixes concerns, hard to render in side panel

## R3: Task creation flow

**Decision**: POST /api/tasks creates both the task and its conversation atomically.

**Rationale**: A task always has exactly one conversation. Creating them together avoids orphaned records. The conversation_id is stored on the task row for quick access.

**Approach**: Single transaction:

1. INSERT INTO tasks → get task_id
2. INSERT INTO conversations (task_id) → get conversation_id
3. UPDATE tasks SET conversation_id = conversation_id
4. Return both IDs

## R4: Backward compatibility of /api/chat

**Decision**: taskId is optional in /api/chat request body. When present, skill executions update the task. When absent, behavior is unchanged.

**Rationale**: Existing integrations (if any) that call /api/chat without taskId should not break. The task update is additive.

## R5: Seasonal Calendar integration path

**Decision**: Move `generateCalendar()` call into SNEW_RUN_SKILL dispatch, not create a new tool.

**Rationale**: The orchestrator already knows how to call `SNEW_RUN_SKILL`. Adding skill-specific tools (SNEW_GENERATE_CALENDAR) would bypass the skill abstraction. Instead, `SNEW_RUN_SKILL("seasonal-calendar", { year: 2026 })` should internally dispatch to `generateCalendar()`.

**This means**: `/api/skills/seasonal-calendar/generate-calendar` route still exists but is only called by the skill dispatch, not directly from the frontend.
