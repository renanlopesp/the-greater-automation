# Implementation Plan: MCP Tools Server

**Branch**: `058-mcp-tools-server` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/058-mcp-tools-server/spec.md`

## Summary

Create a standalone MCP (Model Context Protocol) server that exposes all 37 SNEW*\* and STORE*\* business tools for consumption by the Claude Managed Agent. The server uses `@modelcontextprotocol/sdk` with stdio transport, wrapping existing business logic from `platform-tools.ts` and `retail-tools.ts` without duplication.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: `@modelcontextprotocol/sdk` (McpServer, StdioServerTransport), `zod/v4`, `@supabase/supabase-js`
**Storage**: Supabase PostgreSQL (existing — no schema changes)
**Testing**: Vitest (unit tests for tool registration, integration tests with MCP test client)
**Target Platform**: Node.js server (subprocess spawned by Managed Agent environment)
**Project Type**: Part of existing Next.js monorepo, but the MCP server runs as an independent Node.js process
**Performance Goals**: Tool responses within 5 seconds, server startup within 3 seconds
**Constraints**: Must reuse existing business logic (no duplication), must work as stdio subprocess
**Scale/Scope**: 37 tools (14 SNEW*\* + 23 STORE*\*), single server process per customer session

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                          |
| ------------------------------ | ------ | ------------------------------------------------------------------------------ |
| I. Next.js App Router First    | N/A    | MCP server is a standalone process, not a page/route                           |
| II. shadcn/ui Component System | N/A    | No UI components                                                               |
| III. Tailwind CSS v4 + OKLCH   | N/A    | No styling                                                                     |
| IV. TypeScript Strict Mode     | PASS   | All code in strict TypeScript                                                  |
| V. Simplicity and YAGNI        | PASS   | Wrapping existing logic, no new abstractions beyond the MCP registration layer |
| VI. Supabase as Backend        | PASS   | Uses existing Supabase service role client                                     |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/058-mcp-tools-server/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no schema changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── mcp-tools.md     # Tool registry contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/lib/mcp/
├── snew-tools-server.ts    # Main MCP server entry point (stdio)
├── tool-registry.ts        # Register all tools on McpServer instance
├── context.ts              # TeamContext type + initialization from env vars
└── __tests__/
    ├── tool-registry.test.ts   # Unit: tools register correctly
    └── server.integration.test.ts  # Integration: stdio client ↔ server

src/lib/ai/
├── platform-tools.ts      # EXISTING — refactor: extract execute functions
└── retail-tools.ts         # EXISTING — refactor: extract execute functions
```

**Structure Decision**: The MCP server lives in `src/lib/mcp/` within the existing monorepo. The entry point (`snew-tools-server.ts`) is a standalone Node script that can be run independently via `node` or `bun`. The existing tool files (`platform-tools.ts`, `retail-tools.ts`) are refactored so their `execute` functions are importable standalone (decoupled from Vercel AI SDK's `jsonSchema` wrapper).

## Architecture

### Overview

```
┌─────────────────────────────┐
│  Anthropic Managed Agent    │
│  (claude-sonnet/opus)       │
│                             │
│  MCP Client (built-in)      │
└──────────┬──────────────────┘
           │ stdio (stdin/stdout)
           │
┌──────────▼──────────────────┐
│  snew-tools-server.ts       │
│  (McpServer + StdioTransport)│
│                             │
│  ┌─ tool-registry.ts ──┐   │
│  │ registerTool(...)    │   │
│  │ × 37 tools           │   │
│  └──────────────────────┘   │
│                             │
│  ┌─ context.ts ─────────┐  │
│  │ team_id, user_id,    │  │
│  │ store_id, task_id    │  │
│  └──────────────────────┘  │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  Supabase (service role)    │
│  + Composio API             │
│  + Nuvemshop API            │
└─────────────────────────────┘
```

### Key Design Decisions

1. **Reuse, don't duplicate**: The existing `execute` functions in `platform-tools.ts` and `retail-tools.ts` contain all business logic. The MCP server calls these same functions — it's a thin registration layer that maps MCP tool calls to existing execute functions.

2. **Refactor tool exports**: Currently, `buildPlatformTools()` and `buildRetailTools()` return objects with `{ description, inputSchema, execute }` per tool (Vercel AI SDK format). We refactor to export the `execute` functions independently so both the MCP server and the legacy chat route can use them.

3. **Context via environment variables**: The MCP server receives team context via env vars set by the Managed Agent environment at subprocess spawn:
   - `SNEW_TEAM_ID` — required
   - `SNEW_USER_ID` — required
   - `SNEW_STORE_ID` — optional (empty if no store connected)
   - `SNEW_TASK_ID` — optional (empty if no active task)
   - `SUPABASE_URL` — required
   - `SUPABASE_SERVICE_ROLE_KEY` — required

4. **Zod v4 schemas**: MCP SDK uses Zod for input validation. The existing tools use `jsonSchema()` from Vercel AI SDK. We convert each tool's input schema to Zod v4 equivalents.

5. **Conditional tool registration**: STORE\_\* tools are only registered if `SNEW_STORE_ID` is present. SNEW_MODIFY_ARTIFACT is only registered if `SNEW_TASK_ID` is present.

6. **Tool result format**: MCP tools return `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`. The existing execute functions return plain objects — we JSON-serialize them for the MCP response.

### Phased Implementation

**Phase 1 — Refactor existing tools** (prerequisite):
Extract execute functions from `buildPlatformTools()` and `buildRetailTools()` into importable standalone functions. The existing Vercel AI SDK wrappers continue to work by calling these same functions.

**Phase 2 — MCP server scaffold**:
Create `snew-tools-server.ts` with McpServer + StdioServerTransport. Create `context.ts` for env var parsing. Register one simple tool (SNEW_LIST_SKILLS) to validate the setup.

**Phase 3 — Register all platform tools** (14 SNEW*\*):
Convert each SNEW*\* tool's input schema to Zod and register via `server.registerTool()`.

**Phase 4 — Register all retail tools** (23 STORE*\*):
Convert each STORE*\* tool's input schema to Zod and register conditionally (when store_id exists).

**Phase 5 — Testing**:
Unit tests for tool registration. Integration test using MCP client transport to call tools end-to-end.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
