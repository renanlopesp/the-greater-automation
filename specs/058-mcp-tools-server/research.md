# Research: MCP Tools Server

**Date**: 2026-04-09

## Decision 1: MCP SDK Package and API

**Decision**: Use `@modelcontextprotocol/sdk` (TypeScript SDK) with `McpServer` high-level API + `StdioServerTransport`.

**Rationale**: This is the official MCP TypeScript SDK from the Model Context Protocol organization. It provides `McpServer` (high-level) and `Server` (low-level) APIs. The high-level `McpServer` API handles tool registration with Zod schemas via `server.registerTool()`, which maps cleanly to our existing tool definitions.

**Alternatives considered**:

- Low-level `Server` API: More control but requires manual handler registration. Unnecessary complexity for our use case.
- Custom protocol over HTTP/SSE: Would work but MCP is already supported natively by Claude Managed Agents, so using the standard protocol avoids custom integration work.

## Decision 2: Transport Protocol

**Decision**: Use stdio transport (StdioServerTransport).

**Rationale**: The Managed Agent spawns the MCP server as a subprocess and communicates via stdin/stdout. This is the standard pattern for MCP servers attached to Claude agents. Stdio is simpler than HTTP/SSE — no port management, no auth tokens, no networking concerns.

**Alternatives considered**:

- HTTP+SSE transport: More complex, requires port binding and auth. Only needed for remote MCP servers shared across agents.
- Streamable HTTP: Newer transport but stdio is the established standard for subprocess MCP servers.

## Decision 3: Tool Execute Function Extraction

**Decision**: Refactor `buildPlatformTools()` and `buildRetailTools()` to separate the execute logic from the Vercel AI SDK wrapper. Each tool's execute function becomes an independently importable function.

**Rationale**: The existing functions return objects shaped for Vercel AI SDK (`{ description, inputSchema: jsonSchema(...), execute }`). The MCP server needs the same execute logic but with Zod schemas instead of jsonSchema. By extracting the execute functions, both the MCP server and the legacy chat route can share the same business logic without duplication.

**Pattern**:

```
Before:  buildPlatformTools() → { TOOL_NAME: { inputSchema: jsonSchema(...), execute: async (params) => {...} } }
After:   buildPlatformTools() → same (unchanged for backward compatibility)
         + export async function executeListSkills(ctx: ToolContext): Promise<ToolResult>
         + export async function executeRunSkill(ctx: ToolContext, params: {...}): Promise<ToolResult>
         + ...etc
```

**Alternatives considered**:

- Duplicate the logic in the MCP server: Violates FR-003, creates maintenance burden.
- Import buildPlatformTools() and call .execute() on each tool: Would work but pulls in the Vercel AI SDK dependency (`jsonSchema`) into the MCP server, coupling it to the legacy system.

## Decision 4: Input Schema Conversion (jsonSchema → Zod)

**Decision**: Manually write Zod schemas for each tool in the MCP registration layer. These are simple schemas (string, number, boolean, object fields) that can be converted mechanically.

**Rationale**: The existing tools use `jsonSchema()` from Vercel AI SDK which takes raw JSON Schema objects. The MCP SDK uses Zod v4. Since all tools have simple flat schemas (mostly string/number fields with optional properties), the conversion is straightforward.

**Alternatives considered**:

- Auto-convert JSON Schema to Zod at runtime: Over-engineered for 37 simple schemas. Adds runtime dependency and complexity.
- Use `z.any()` for all inputs: Would lose validation benefits. Defeats the purpose of typed schemas.

## Decision 5: Context Passing

**Decision**: Pass team context via environment variables (`SNEW_TEAM_ID`, `SNEW_USER_ID`, `SNEW_STORE_ID`, `SNEW_TASK_ID`) set when the Managed Agent spawns the MCP subprocess.

**Rationale**: Stdio MCP servers cannot receive context via HTTP headers or query parameters. Environment variables are the standard mechanism for subprocess configuration. The Managed Agent environment sets these at spawn time based on the current session's team/user.

**Alternatives considered**:

- Pass context as first MCP message: Non-standard, would require custom protocol extension.
- Embed context in each tool call: Redundant and error-prone. Context is session-scoped, not call-scoped.

## Decision 6: Conditional Tool Registration

**Decision**: Register STORE\_\* tools only when `SNEW_STORE_ID` env var is present. Register SNEW_MODIFY_ARTIFACT only when `SNEW_TASK_ID` is present.

**Rationale**: Not all sessions have a store (new users during onboarding) or an active task (general chat). Registering tools that can't function prevents confusing error responses and reduces the agent's tool list to only relevant capabilities.

**Alternatives considered**:

- Register all tools always, return errors when context is missing: Adds noise to the agent's tool list and wastes tokens on unusable tools.
- Dynamic tool registration mid-session: MCP protocol supports tool list changes, but adds complexity. Better to set the right tools at startup.
