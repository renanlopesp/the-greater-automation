# Implementation Plan: Workflow AI Assistant

**Branch**: `022-workflow-ai-assistant` | **Date**: 2026-02-16 | **Spec**: `specs/022-workflow-ai-assistant/spec.md`

## Summary

Replace the hardcoded pattern-matching workflow assistant with a real AI-powered assistant using Vercel AI SDK v6 streaming. The assistant will have full context of all 9 trigger types and 8 step types, stream responses in real-time via `useChat()`, and support applying structured workflow suggestions to the editor. Follows the existing agent-chat pattern (`src/hooks/use-agent-chat.ts`, `src/lib/ai/agent-chat.ts`).

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`), Zustand, TanStack React Query
**Storage**: Supabase PostgreSQL (optional conversation persistence)
**Testing**: Vitest + @testing-library/react (unit), Playwright (E2E)
**Target Platform**: Web (Next.js App Router)
**Performance Goals**: First token < 500ms, full stream completion < 10s for typical responses
**Constraints**: Must use existing OpenAI API key (OPEN_AI_API_KEY), must not break existing workflow editor functionality

## Architecture

### API Route (Server)

**File**: `src/app/api/workflows/[id]/assistant/route.ts` (replace existing)

- Convert from simple JSON response to Vercel AI SDK streaming response
- Use `streamText()` from `ai` package with OpenAI provider
- Build a rich system prompt with full workflow domain context
- Accept messages array (conversation history) instead of single prompt
- Return streaming response compatible with `useChat()`

### System Prompt Builder (Server)

**File**: `src/lib/ai/workflow-assistant.ts` (new)

- `buildWorkflowAssistantPrompt(workflowContext)` function
- Embeds all 9 trigger types with their config schemas
- Embeds all 8 step types with their config schemas
- Embeds variable interpolation syntax documentation
- Embeds current workflow state (trigger, steps, name)
- Instructs AI to return structured JSON for workflow suggestions
- Uses tool calling for structured workflow output (SUGGEST_WORKFLOW tool)

### Client Hook

**File**: `src/hooks/use-workflow-assistant.ts` (new)

- Wraps Vercel AI SDK `useChat()` hook
- Transport configured for `/api/workflows/[id]/assistant`
- Passes current workflow context (trigger, steps, name) as request body
- Detects `SUGGEST_WORKFLOW` tool calls in responses to extract structured suggestions
- Exposes: messages, isLoading, isStreaming, sendMessage, suggestedWorkflow

### UI Component

**File**: `src/components/workflow-editor/ai-assistant-panel.tsx` (rewrite)

- Replace manual fetch with `useWorkflowAssistant()` hook
- Render streaming messages with markdown support
- Show "Apply to editor" button when tool call produces a suggested workflow
- Keep use-case cards for empty state
- Proper scroll-to-bottom on new messages

## Project Structure

### Source Code

```text
src/
├── app/api/workflows/[id]/assistant/
│   └── route.ts                          # REWRITE: streaming AI endpoint
├── lib/ai/
│   └── workflow-assistant.ts             # NEW: system prompt builder + types
├── hooks/
│   ├── use-workflow-assistant.ts         # NEW: useChat wrapper for workflow AI
│   └── __tests__/
│       └── use-workflow-assistant.test.ts # NEW: unit tests
├── components/workflow-editor/
│   └── ai-assistant-panel.tsx            # REWRITE: streaming UI
└── lib/workflow-editor/
    ├── trigger-metadata.ts               # READ: trigger type info
    ├── trigger-defaults.ts               # READ: trigger config schemas
    ├── step-metadata.ts                  # READ: step type info
    └── step-defaults.ts                  # READ: step config schemas

e2e/
└── workflow-assistant.spec.ts            # NEW: Playwright E2E tests

src/lib/ai/__tests__/
└── workflow-assistant.test.ts            # NEW: unit tests for prompt builder
```

## Key Design Decisions

1. **Tool Calling for Structured Output**: Instead of asking the AI to embed JSON in text, we use Vercel AI SDK's tool calling. A `SUGGEST_WORKFLOW` tool definition ensures the AI returns properly structured trigger/step data that can be validated and applied.

2. **Reuse Existing Patterns**: Follow the same pattern as `use-agent-chat.ts` (Vercel AI SDK v6 `useChat()` with `DefaultChatTransport`) rather than inventing new patterns.

3. **System Prompt with Full Schema Context**: Embed all trigger/step schemas directly in the system prompt so the AI has complete domain knowledge without needing external tools.

4. **No Database Changes for MVP**: US1-US4 don't require database changes. US5 (conversation persistence) can use a simple localStorage approach for MVP, with DB persistence as a follow-up.
