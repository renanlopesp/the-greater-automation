# Implementation Plan: Foundation & Infrastructure

**Branch**: `001-foundation` | **Date**: 2026-02-07 | **Spec**: `specs/001-foundation/spec.md`
**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

Establish the complete backend infrastructure for Relay: Supabase database schema with 12 tables, TypeScript type definitions, browser and server Supabase clients, auth middleware for protected routes, TanStack Query provider, and updated root layout with Inter font and sonner toasts. This phase produces zero UI but provides the typed data layer, authentication boundary, and provider infrastructure that all subsequent features depend on.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 16.1.6, React 19.2.3, @supabase/supabase-js, @supabase/ssr, @tanstack/react-query, zustand, react-hook-form, zod, @hookform/resolvers, date-fns, sonner, recharts, cmdk
**Storage**: Supabase (PostgreSQL) with Row Level Security
**Testing**: Vitest (unit tests) + Playwright (e2e tests) + `bun run build` + `bun run lint`. Tooling setup in Phase 6.
**Target Platform**: Web (server-rendered via Next.js App Router)
**Project Type**: Web application (Next.js monolith with Supabase backend)
**Performance Goals**: Middleware auth check < 50ms for authenticated users, < 100ms redirect for unauthenticated users
**Constraints**: All data access through Supabase client (no custom API routes for CRUD), RLS on all tables, cookie-based sessions only
**Scale/Scope**: 12 database tables, 7 new source files, 1 modified file, 1 SQL schema file

## Constitution Check

*GATE: Must pass before implementation. All 6 principles validated.*

| # | Principle | Status | Evidence |
|---|-----------|--------|----------|
| I | Next.js App Router First | PASS | All new files live under `src/`. Middleware uses Next.js middleware API (`src/middleware.ts`). Server client uses Server Component patterns. QueryProvider is a client component only because it must use React context. |
| II | shadcn/ui Component System | PASS | No custom UI components created in this phase. shadcn components (avatar, badge, separator, tooltip, dropdown-menu, scroll-area, dialog, command, popover, tabs, table, select, checkbox, textarea, sheet, switch, slider, sidebar) are installed via CLI for future use. Toaster uses sonner (not a shadcn component but specified in the development spec). |
| III | Tailwind CSS v4 + OKLCH Theming | PASS | No styling changes in this phase. Existing globals.css with OKLCH theme tokens is preserved. Inter font is added via next/font/google (no CSS changes needed). |
| IV | TypeScript Strict Mode | PASS | All new files are TypeScript. database.types.ts provides full type coverage for all tables. Supabase clients are typed with `Database` generic. No `any` types used. |
| V | Simplicity and YAGNI | PASS | Only files explicitly required by Phase 1 of the development spec are created. No abstractions beyond what is needed. Supabase clients are thin wrappers. Middleware is a simple route check. No feature flags, no premature optimization. |
| VI | Supabase as Backend | PASS | Supabase is the sole backend. Auth via `@supabase/ssr`. Database access via typed client. RLS enabled on all tables. Server client uses cookie-based sessions. No custom API routes for CRUD. |

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task checklist
```

### Source Code (repository root)

```text
relay/
├── .env.local                           # [CREATE] Supabase credentials (gitignored)
├── supabase/
│   └── schema.sql                       # [CREATE] Full database schema (12 tables, RLS, indexes, triggers)
├── src/
│   ├── app/
│   │   └── layout.tsx                   # [MODIFY] Add Inter font, QueryProvider, Toaster
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts                # [CREATE] Browser Supabase client
│   │       ├── server.ts                # [CREATE] Server Supabase client (cookie-based)
│   │       └── database.types.ts        # [CREATE] TypeScript types for all tables
│   ├── providers/
│   │   └── query-provider.tsx           # [CREATE] TanStack Query provider wrapper
│   └── middleware.ts                    # [CREATE] Auth middleware for protected routes
└── package.json                         # [MODIFY] New dependencies added via bun
```

**Structure Decision**: Single Next.js application following the existing App Router structure. All new files are placed in their canonical locations per the constitution's project structure. The `supabase/` directory at the project root is standard for Supabase projects and contains only the SQL schema.

## Data Model

### Enums

```sql
-- Custom enum types for type safety at the database level
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE workflow_status AS ENUM ('draft', 'published');
CREATE TYPE trigger_type AS ENUM ('manual', 'scheduled', 'webhook', 'form', 'rss', 'mailhook', 'table', 'mcp', 'app');
CREATE TYPE step_type AS ENUM ('app', 'ai', 'flow_control', 'web_scraping', 'human_in_loop', 'utility', 'http', 'sequence');
CREATE TYPE run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error');
```

### Complete Schema

```sql
-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update their teams"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. TEAM_MEMBERS
-- ============================================================
CREATE TABLE team_members (
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        team_role NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view memberships of their teams"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can manage memberships"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Index
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ============================================================
-- 4. AGENTS
-- ============================================================
CREATE TABLE agents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  avatar_url  text,
  avatar_type text DEFAULT 'dots',
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view agents"
  ON agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create agents"
  ON agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update agents"
  ON agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can delete agents"
  ON agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agents.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_agents_team_id ON agents(team_id);

-- ============================================================
-- 5. FOLDERS
-- ============================================================
CREATE TABLE folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        text NOT NULL,
  parent_id   uuid REFERENCES folders(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view folders"
  ON folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = folders.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage folders"
  ON folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = folders.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE INDEX idx_folders_team_id ON folders(team_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- ============================================================
-- 6. WORKFLOWS
-- ============================================================
CREATE TABLE workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  folder_id     uuid REFERENCES folders(id) ON DELETE SET NULL,
  name          text NOT NULL,
  emoji         text DEFAULT '⚡',
  description   text,
  status        workflow_status NOT NULL DEFAULT 'draft',
  is_starred    boolean NOT NULL DEFAULT false,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view workflows"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create workflows"
  ON workflows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update workflows"
  ON workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can delete workflows"
  ON workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = workflows.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_workflows_team_id ON workflows(team_id);
CREATE INDEX idx_workflows_folder_id ON workflows(folder_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_is_starred ON workflows(team_id, is_starred) WHERE is_starred = true;

-- ============================================================
-- 7. WORKFLOW_TRIGGERS
-- ============================================================
CREATE TABLE workflow_triggers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL UNIQUE REFERENCES workflows(id) ON DELETE CASCADE,
  type          trigger_type NOT NULL,
  config        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view triggers via workflow"
  ON workflow_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_triggers.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage triggers via workflow"
  ON workflow_triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_triggers.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. WORKFLOW_STEPS
-- ============================================================
CREATE TABLE workflow_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  type          step_type NOT NULL,
  name          text NOT NULL,
  config        jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, position)
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view steps via workflow"
  ON workflow_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_steps.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage steps via workflow"
  ON workflow_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_steps.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);

-- ============================================================
-- 9. AGENT_SKILLS
-- ============================================================
CREATE TABLE agent_skills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workflow_id   uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name          text NOT NULL,
  last_run_at   timestamptz,
  run_count     integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, workflow_id)
);

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view skills via agent"
  ON agent_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN team_members ON team_members.team_id = agents.team_id
      WHERE agents.id = agent_skills.agent_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage skills via agent"
  ON agent_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM agents
      JOIN team_members ON team_members.team_id = agents.team_id
      WHERE agents.id = agent_skills.agent_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE INDEX idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX idx_agent_skills_workflow_id ON agent_skills(workflow_id);

-- ============================================================
-- 10. WORKFLOW_RUNS
-- ============================================================
CREATE TABLE workflow_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES agents(id) ON DELETE SET NULL,
  status          run_status NOT NULL DEFAULT 'pending',
  steps_used      integer NOT NULL DEFAULT 0,
  ai_credits_used numeric(10,2) NOT NULL DEFAULT 0,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view runs via workflow"
  ON workflow_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create runs via workflow"
  ON workflow_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update runs via workflow"
  ON workflow_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN team_members ON team_members.team_id = workflows.team_id
      WHERE workflows.id = workflow_runs.workflow_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_created_at ON workflow_runs(created_at DESC);

-- ============================================================
-- 11. APP_CONNECTIONS
-- ============================================================
CREATE TABLE app_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  app_name      text NOT NULL,
  app_logo_url  text,
  status        connection_status NOT NULL DEFAULT 'disconnected',
  credentials   jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, app_name)
);

ALTER TABLE app_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON app_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connections"
  ON app_connections FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_app_connections_user_id ON app_connections(user_id);
CREATE INDEX idx_app_connections_team_id ON app_connections(team_id);

-- ============================================================
-- 12. USAGE
-- ============================================================
CREATE TABLE usage (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  steps_used      integer NOT NULL DEFAULT 0,
  steps_limit     integer NOT NULL DEFAULT 1000,
  ai_credits_used numeric(10,2) NOT NULL DEFAULT 0,
  ai_credits_limit numeric(10,2) NOT NULL DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, period_start),
  CHECK (period_end > period_start),
  CHECK (steps_used >= 0),
  CHECK (steps_limit >= 0),
  CHECK (ai_credits_used >= 0),
  CHECK (ai_credits_limit >= 0)
);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view usage"
  ON usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = usage.team_id
        AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage usage"
  ON usage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = usage.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'owner'
    )
  );

CREATE INDEX idx_usage_team_id ON usage(team_id);
CREATE INDEX idx_usage_period ON usage(team_id, period_start, period_end);

-- ============================================================
-- SHARED: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all mutable tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Indexes Summary

| Table | Index | Columns | Notes |
|-------|-------|---------|-------|
| team_members | idx_team_members_team_id | team_id | Lookup members by team |
| team_members | idx_team_members_user_id | user_id | Lookup teams by user |
| agents | idx_agents_team_id | team_id | List agents per team |
| folders | idx_folders_team_id | team_id | List folders per team |
| folders | idx_folders_parent_id | parent_id | Navigate folder hierarchy |
| workflows | idx_workflows_team_id | team_id | List workflows per team |
| workflows | idx_workflows_folder_id | folder_id | List workflows in folder |
| workflows | idx_workflows_status | status | Filter by draft/published |
| workflows | idx_workflows_is_starred | team_id, is_starred (partial) | Quick starred lookup |
| workflow_steps | idx_workflow_steps_workflow_id | workflow_id | List steps per workflow |
| agent_skills | idx_agent_skills_agent_id | agent_id | List skills per agent |
| agent_skills | idx_agent_skills_workflow_id | workflow_id | Reverse lookup |
| workflow_runs | idx_workflow_runs_workflow_id | workflow_id | List runs per workflow |
| workflow_runs | idx_workflow_runs_status | status | Filter by run status |
| workflow_runs | idx_workflow_runs_created_at | created_at DESC | Recent runs first |
| app_connections | idx_app_connections_user_id | user_id | User's connections |
| app_connections | idx_app_connections_team_id | team_id | Team's connections |
| usage | idx_usage_team_id | team_id | Team usage lookup |
| usage | idx_usage_period | team_id, period_start, period_end | Period range queries |

### RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own profile only | Auto via trigger | Own profile only | N/A (cascades from auth.users) |
| teams | Team members | Any authenticated user | Team owner only | N/A |
| team_members | Fellow team members | Owner/admin | Owner/admin | Owner/admin |
| agents | Team members | Team members | Team members | Owner/admin |
| folders | Team members | Team members | Team members | Team members |
| workflows | Team members | Team members | Team members | Owner/admin |
| workflow_triggers | Via workflow team membership | Via workflow team membership | Via workflow team membership | Via workflow team membership |
| workflow_steps | Via workflow team membership | Via workflow team membership | Via workflow team membership | Via workflow team membership |
| agent_skills | Via agent team membership | Via agent team membership | Via agent team membership | Via agent team membership |
| workflow_runs | Via workflow team membership | Via workflow team membership | Via workflow team membership | N/A |
| app_connections | Own connections only | Own connections only | Own connections only | Own connections only |
| usage | Team members | Team owner | Team owner | Team owner |

## Developer Tooling & Testing Infrastructure

### Testing Stack

| Tool | Purpose | Config File |
|------|---------|-------------|
| Vitest | Unit tests & component tests | `vitest.config.ts` |
| @testing-library/react | Component rendering & assertions | — |
| Playwright | End-to-end browser tests | `playwright.config.ts` |
| happy-dom | DOM environment for Vitest | — |

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/components/ui/**', 'src/**/*.d.ts', 'src/test/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Code Quality Tools

| Tool | Purpose | Config File |
|------|---------|-------------|
| ESLint | Linting (already configured via Next.js) | `eslint.config.mjs` |
| Prettier | Code formatting | `.prettierrc` |
| Husky | Git hooks | `.husky/` |
| lint-staged | Run linters on staged files only | `package.json` |

### Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Husky + lint-staged Configuration

```json
// package.json (partial)
{
  "scripts": {
    "prepare": "husky",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

### Husky Pre-commit Hook

```bash
# .husky/pre-commit
bunx lint-staged
```

### Husky Pre-push Hook

```bash
# .husky/pre-push
bun run build
bun run test
```

### File Structure (Tooling)

```text
relay/
├── vitest.config.ts           # [CREATE] Vitest configuration
├── playwright.config.ts       # [CREATE] Playwright configuration
├── .prettierrc                # [CREATE] Prettier configuration
├── .prettierignore            # [CREATE] Prettier ignore patterns
├── .husky/
│   ├── pre-commit             # [CREATE] lint-staged on commit
│   └── pre-push               # [CREATE] build + test on push
├── e2e/                       # [CREATE] Playwright e2e tests directory
│   └── .gitkeep
├── src/
│   └── test/
│       └── setup.ts           # [CREATE] Vitest setup (jest-dom matchers)
└── package.json               # [MODIFY] Add scripts, lint-staged config
```

## Complexity Tracking

No constitution violations. All files follow the simplest possible implementation:
- Supabase clients are thin wrappers around `@supabase/supabase-js` and `@supabase/ssr`
- Middleware is a single `if/else` route check with no abstraction layers
- QueryProvider is a minimal client component wrapper
- Database types are a single hand-written file (will be replaced by `supabase gen types` when CLI is set up in a later phase)
- No repository pattern, no service layer, no custom API routes
- Testing tools are standard, minimal configuration -- no custom test utilities beyond setup file
