# API Contract: Pipeline Execution

**Feature**: 021-app-event-triggers

## Internal Functions (not HTTP endpoints)

### `executePipeline(params)`

**Purpose**: Execute a multi-step workflow pipeline, tracking each step individually.

**Input**:

```typescript
{
  workflowId: string
  agentId: string
  triggerData: Record<string, unknown>   // Event payload
  actions: WorkflowActionConfig[]        // Ordered list of steps
  conditions: WorkflowCondition[]        // Pre-execution conditions
  eventLogId?: string                    // For idempotency
}
```

**Behavior**:

1. Create run record with `status: 'running'`, initialize `pipeline_steps` array
2. Evaluate conditions — if fail, mark run as `'skipped'`
3. For each action (sequentially):
   a. Update step status to `'running'` in `pipeline_steps`
   b. Resolve templates (`{{trigger.*}}`, `{{prev.*}}`) from trigger data and previous outputs
   c. Execute action (composio_action, ai_transform, claude_agent, notify)
   d. On success: update step to `'completed'`, store output
   e. On failure: update step to `'failed'`, mark remaining steps as `'skipped'`, mark run as `'failed'`
4. If all steps complete: mark run as `'completed'`

**Output**:

```typescript
{
  run_id: string
  status: 'completed' | 'failed' | 'skipped'
  pipeline_steps: PipelineStepRecord[]
  duration_ms: number
}
```

---

### `executeClaudeAgentStep(params)`

**Purpose**: Execute a Claude Agent action within a pipeline step.

**Input**:

```typescript
{
  config: ClaudeAgentActionConfig
  triggerData: Record<string, unknown>
  previousOutputs: Record<string, unknown>
  agentId: string
  userId: string
}
```

**Behavior**:

1. Resolve prompt template with trigger data and previous outputs
2. Build tool list from `config.tools` (Composio tools for the user's connected apps)
3. Call AI SDK with system prompt, tools, and timeout
4. Parse response into structured output (JSON if `output_format: 'json'`)
5. Return output keyed by `config.output_key`

**Output**:

```typescript
{
  [output_key]: unknown  // Structured result from Claude
}
```

**Errors**: Throws on timeout, model error, or invalid output format.

---

### `resolveConditionalBranch(params)`

**Purpose**: Evaluate conditions to determine which branch of steps to execute.

**Input**:

```typescript
{
  conditions: WorkflowCondition[]
  triggerData: Record<string, unknown>
  previousOutputs: Record<string, unknown>
}
```

**Output**:

```typescript
{
  branch: 'then' | 'else'
  condition_results: ConditionResult[]
}
```
