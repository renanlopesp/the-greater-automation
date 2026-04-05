# Research: Chat Dynamic Artifacts

## R1: Artifact Generation Approach

**Decision**: Instruct the AI via system prompt to call `SNEW_MODIFY_ARTIFACT` after retail tool calls, rather than auto-detecting tool results in code.

**Rationale**: The AI already has SNEW_MODIFY_ARTIFACT. Adding a system prompt instruction is simpler and more flexible than intercepting tool results in the route handler. The AI can also decide NOT to create an artifact for trivial responses.

**Alternatives considered**:

- Auto-intercept tool results in route.ts: Complex, requires parsing all tool calls, less flexible
- New dedicated tool: Adds unnecessary complexity when SNEW_MODIFY_ARTIFACT already exists
- Client-side detection: Would require parsing AI text, fragile and inaccurate

## R2: Artifact Data Flow

**Decision**: Use the existing pipeline: AI calls SNEW_MODIFY_ARTIFACT → tool writes to `tasks.artifact_data` + `tasks.artifact_type` → `useTask` polling picks up change → `ArtifactRenderer` renders.

**Rationale**: This is exactly how the seasonal calendar artifact works. Zero new infrastructure needed. The only addition is a new `artifact_type` value ('chat-data') and a new renderer component.

## R3: Artifact Type Detection

**Decision**: The AI includes a `type` field in the artifact data payload that specifies which visual renderer to use (sales_summary, product_table, order_list, metric_card).

**Rationale**: The AI has full context about what data it just fetched and can choose the right visualization type. This is more accurate than trying to infer the type from the data shape.

## R4: Priority Over Skill Artifacts

**Decision**: Chat-data artifacts use a DIFFERENT `artifact_type` value ('chat-data') than skill artifacts ('seasonal-calendar'). The system prompt instructs the AI to NOT call SNEW_MODIFY_ARTIFACT when a skill artifact is already active (detectable from task metadata).

**Rationale**: Simple and explicit. The AI knows the context and can make the right decision. No complex priority logic needed in code.
