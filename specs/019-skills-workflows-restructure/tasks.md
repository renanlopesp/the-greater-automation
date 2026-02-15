# Tasks: Skills vs Workflows Restructure

## Phase 1: Database

- [x] T1.1: Create migration for `agent_knowledge_skills` table with RLS policies
- [x] T1.2: Regenerate TypeScript database types

## Phase 2: Backend — LLM Tools

- [x] T2.1: Rename SNEW_CREATE_SKILL → SNEW_CREATE_WORKFLOW (and LIST, UPDATE, DELETE, TEST)
- [x] T2.2: Add new SNEW_CREATE_SKILL, SNEW_LIST_SKILLS, SNEW_DELETE_SKILL for knowledge skills
- [x] T2.3: Update system prompt in agent-chat.ts — separate workflow/skill sections
- [x] T2.4: Inject knowledge skills into agent system prompt
- [x] T2.5: Update chat route to load knowledge skills

## Phase 3: Server Actions

- [x] T3.1: Create `src/lib/actions/agent-knowledge-skills.ts` with CRUD actions

## Phase 4: UI — Agent Sidebar

- [x] T4.1: Add Tabs component to agent-sidebar.tsx (Workflows | Skills)
- [x] T4.2: Rename skills-list.tsx to show only workflows (source='rule')
- [x] T4.3: Create knowledge-skills-list.tsx with add/remove/toggle UI

## Phase 5: Testing

- [x] T5.1: Unit tests for knowledge skills CRUD
- [x] T5.2: Unit tests for system prompt skill injection
- [x] T5.3: E2E Playwright test for sidebar tabs and skill management
- [x] T5.4: E2E Playwright test for workflow creation via chat

## Dependencies

- T1.1 blocks all other tasks
- T2.1-T2.5 can run in parallel after T1
- T3.1 blocks T4.3
- T4.1-T4.3 can run in parallel after T3.1
- T5.\* runs after T4
