# Quickstart: Structured Skills & Terminology Alignment

## Prerequisites

- Supabase project running (production: `djohaxwfketlsjurwqne`, branch: `ejqumzvclfkbbzzdvmmi`)
- Node/bun installed
- Access to Supabase dashboard for migration verification

## Implementation Order

### Phase 1: Database Migration

1. Apply migration via Supabase MCP `apply_migration`
2. Regenerate types: update `database.types.ts`
3. Verify in Supabase dashboard that tables are renamed

### Phase 2: Code Rename (bottom-up)

1. Types and interfaces first (`src/lib/supabase/database.types.ts`)
2. Server actions (`agent-skills.ts` → `agent-workflows.ts`, `agent-knowledge-skills.ts` → `agent-skills.ts`)
3. Hooks (`use-agent-skills.ts` → `use-agent-workflows.ts`)
4. Components (`skills-list.tsx` → `workflows-list.tsx`, `knowledge-skills-list.tsx` → `skills-list.tsx`)
5. API routes (move directories)
6. Update all imports

### Phase 3: Structured Skills

1. Update `SNEW_CREATE_SKILL` tool — add type parameter, template instructions
2. Add `SNEW_GET_SKILL_CONTENT` tool
3. Add `SNEW_UPDATE_SKILL` tool
4. Add `SNEW_EXECUTE_SKILL` tool
5. Update system prompt for progressive disclosure

### Phase 4: UI

1. Update `SkillsList` (new name) to render structured sections
2. Add type badge (Knowledge/Procedure)
3. Add collapsible markdown sections
4. Add procedure parameter display

### Phase 5: Testing

1. Update all existing tests for new names
2. Add tests for structured skill creation
3. Add tests for procedure skill execution
4. E2E test for skill creation via chat

## Verification

```bash
bun run build    # Zero errors
bun run test     # All tests pass
bun run lint     # Zero warnings
```

## Key Files to Touch

~30 files total. See `research.md` section R7 for complete rename map.
