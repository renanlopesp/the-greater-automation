# Research: Single Agent + Skills Migration

## R1: Skill Invocation Strategy

**Decision**: Skills are invoked by injecting the skill's system prompt + tools into the Snew chat context at runtime, not by HTTP delegation.

**Rationale**: The current `SNEW_ASK_AGENT` makes an HTTP POST to `/api/agents/[id]/chat`, creating a separate conversation. This adds latency (~500ms+ for the internal HTTP round-trip), duplicates conversation storage, and fragments the user's chat history. Direct injection is simpler, faster, and keeps everything in one conversation.

**Alternatives considered**:

- Internal function call (no HTTP) to agent-chat.ts → rejected because it still requires agent context loading per-agent
- Tool-based skill execution (skill returns structured output) → considered for Phase 1 CMO skills, but for Fase 0 the simpler injection approach works

## R2: Skill Registry — Database vs Code

**Decision**: Hybrid approach. Skill definitions are static in code (`src/data/skills.ts`) with per-team state in the database (`skills` table stores activation status, custom config).

**Rationale**: The 34 agent definitions are currently static in `src/data/agents.ts`. Moving them to pure DB would require a seeding mechanism and make deployments harder. Keeping definitions in code means new skills ship with deploys. The DB layer tracks which skills each team has activated and any team-specific overrides.

**Alternatives considered**:

- Pure DB (all skill definitions in database) → rejected because it requires seed scripts, makes git diffs impossible for skill changes, and adds complexity for no Fase 0 benefit
- Pure code (no DB at all) → rejected because we need per-team activation state and execution tracking

## R3: Conversation Unification Strategy

**Decision**: New conversations go to `conversations` + `conversation_messages` (orchestrator tables). Legacy `agent_conversations` + `agent_messages` are kept read-only. No data migration.

**Rationale**: Migrating existing conversation data is risky and unnecessary. The legacy tables have agent_id foreign keys that don't map cleanly to the new model. Keeping them as-is preserves history. New code only writes to the unified tables.

**Alternatives considered**:

- Full migration (copy all agent_conversations → conversations) → rejected because of FK complexity and risk of data loss
- Dual-write (write to both old and new) → rejected because it adds complexity with no benefit

## R4: How Skills Compose (multi-skill responses)

**Decision**: For Fase 0, the Snew orchestrator decides which skill context to load based on the user's message. If multiple skills are needed, Snew handles them sequentially within the same chat turn (loads skill A context, produces output, then loads skill B context). No formal composition framework.

**Rationale**: Building a skill composition engine is premature. The LLM is already good at multi-step reasoning. For Fase 0 we just need the infrastructure to load skill contexts. Formal composition can be added in Fase 1+ if needed.

## R5: UI Migration — Incremental vs Big Bang

**Decision**: Incremental. Replace agent-specific UI with skill-equivalent UI component by component. Keep shared infrastructure (chat panel, activity feed, workspace store).

**Rationale**: A big-bang UI rewrite is risky and unnecessary. Many components (chat panel, activity feed, workspace) are skill-agnostic. The main changes are: agent-card → skill-card, agents-grid → skills-grid, sidebar agent links → skill categories, agents discover → skill library.

## R6: Platform Tools Replacement

**Decision**: Replace 4 agent tools with 3 skill tools:

| Remove              | Add                                                                     |
| ------------------- | ----------------------------------------------------------------------- |
| `SNEW_LIST_AGENTS`  | `SNEW_LIST_SKILLS` — list available skills with status                  |
| `SNEW_GET_AGENT`    | `SNEW_GET_SKILL` — get skill details (description, tools, dependencies) |
| `SNEW_CREATE_AGENT` | (removed — skills come from registry, not created at runtime)           |
| `SNEW_ASK_AGENT`    | `SNEW_RUN_SKILL` — execute a skill with structured input/output         |

Additionally keep: `SNEW_GET_AGENT_ACTIVITY` → rename to `SNEW_GET_SKILL_ACTIVITY`.

**Rationale**: The 1:1 mapping preserves orchestrator capabilities. `SNEW_CREATE_AGENT` has no equivalent because skills are predefined in the registry (lojista activates, doesn't create). `SNEW_RUN_SKILL` is the key new tool — it loads skill context and runs it.
