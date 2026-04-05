# Implementation Plan: Chat Dynamic Artifacts

**Branch**: `055-chat-dynamic-artifacts` | **Date**: 2026-04-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/055-chat-dynamic-artifacts/spec.md`

## Summary

Add Perplexity-style dynamic artifacts to the general chat. When the AI uses retail tools (STORE_QUERY_SALES, STORE_QUERY_STOCK, STORE_LIST_ORDERS), the system automatically generates a visual artifact in the right panel showing the data as structured cards/tables. Uses existing `SNEW_MODIFY_ARTIFACT` tool + `tasks.artifact_data` pipeline.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19, Tailwind CSS v4, shadcn/ui, Vercel AI SDK (streamText, tools)
**Storage**: Supabase PostgreSQL — existing `tasks` table (`artifact_data` JSONB, `artifact_type` text, `skill_status` text)
**Testing**: Visual verification via Playwright
**Target Platform**: Web (desktop + mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Artifact appears within 1s of AI response completing
**Constraints**: Must not break existing skill artifacts (seasonal calendar). Retail tools already exist.
**Scale/Scope**: 4 artifact types, 3 files modified, 1 new file

## Constitution Check

| Principle                      | Status | Notes                                                                           |
| ------------------------------ | ------ | ------------------------------------------------------------------------------- |
| I. Next.js App Router First    | PASS   | No new routes. Uses existing `/api/chat` route. Artifact rendered client-side.  |
| II. shadcn/ui Component System | PASS   | New artifact component uses Tailwind classes.                                   |
| III. Tailwind CSS v4 + OKLCH   | PASS   | All styling via Tailwind classes and CSS variables.                             |
| IV. TypeScript Strict Mode     | PASS   | New ChatDataArtifact type definition, strict types for artifact payloads.       |
| V. Simplicity and YAGNI        | PASS   | Reuses existing SNEW_MODIFY_ARTIFACT tool. No new API routes. No new DB tables. |
| VI. Supabase as Backend        | PASS   | Uses existing `tasks.artifact_data` JSONB column — no schema changes.           |

All gates pass.

## Project Structure

### Source Code (files to modify/create)

```text
src/
├── components/chat/
│   ├── artifact-renderer.tsx           # MODIFY: add 'chat-data' case to switch
│   └── artifacts/
│       └── chat-data-artifact.tsx      # NEW: renders sales/product/order/metric cards
└── app/api/chat/
    └── route.ts                       # MODIFY: add system prompt instruction for artifact generation
```

## Key Design Decisions

### 1. Reuse SNEW_MODIFY_ARTIFACT (no new tools)

The AI already has `SNEW_MODIFY_ARTIFACT` which writes to `tasks.artifact_data`. After calling a retail tool, the AI calls `SNEW_MODIFY_ARTIFACT` with `artifact_type: 'chat-data'` and the structured data. This triggers the existing `useTask` polling → `ArtifactRenderer` flow.

### 2. System Prompt Instruction

The chat route system prompt is updated to instruct the AI: "After using any STORE\_\* tool, ALWAYS call SNEW_MODIFY_ARTIFACT with the data formatted as a chat-data artifact."

### 3. Artifact Data Structure

```typescript
interface ChatDataArtifact {
  type: 'sales_summary' | 'product_table' | 'order_list' | 'metric_card'
  title: string
  data: SalesSummaryData | ProductTableData | OrderListData | MetricCardData
}
```

### 4. Skill Artifacts Take Priority

If `artifact_type` is already a skill type ('seasonal-calendar'), the AI is instructed to skip SNEW_MODIFY_ARTIFACT.
