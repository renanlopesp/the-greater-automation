<!--
Sync Impact Report
- Version change: 0.0.0 → 1.0.0
- Added sections: All (initial ratification)
- Templates requiring updates: ✅ spec-template.md (no changes needed) | ✅ plan-template.md (no changes needed) | ✅ tasks-template.md (no changes needed)
- Follow-up TODOs: None
-->

# Relay Constitution

## Core Principles

### I. Next.js App Router First

All pages and layouts MUST use the Next.js 16 App Router (`src/app/`). Server Components are the default; `"use client"` MUST only be added when client-side interactivity is required (event handlers, hooks, browser APIs). Data fetching MUST happen in Server Components or Route Handlers. No Pages Router usage is permitted.

### II. shadcn/ui Component System

UI MUST be built with shadcn/ui components (new-york style) from `src/components/ui/`. Custom components MUST compose shadcn primitives rather than creating parallel implementations. New shadcn components MUST be added via `npx shadcn@latest add <component>`. The `cn()` utility from `@/lib/utils` MUST be used for all dynamic className composition.

### III. Tailwind CSS v4 + OKLCH Theming

Styling MUST use Tailwind CSS v4 with CSS-first configuration (no `tailwind.config.js`). Theme tokens are defined as CSS variables in `src/app/globals.css` using OKLCH color space. Direct hex/rgb colors MUST NOT be used; all colors MUST reference CSS variable-based theme tokens. Responsive design MUST use Tailwind breakpoints.

### IV. TypeScript Strict Mode

All code MUST be written in TypeScript with strict mode enabled. `any` types are forbidden except at genuine type boundaries (third-party libs without types). Zod MUST be used for runtime validation of external data (API responses, form inputs, URL params). Database types MUST be generated from Supabase schema.

### V. Simplicity and YAGNI

Start with the simplest solution that works. MUST NOT add abstractions, patterns, or features beyond what the current spec requires. No premature optimization. No feature flags for unreleased features. Three similar lines of code are preferred over a premature abstraction. Error handling MUST only be added at system boundaries (user input, external APIs, Supabase calls).

### VI. Supabase as Backend

Supabase MUST be the sole backend. Authentication via `@supabase/ssr`. Database access via generated TypeScript client. Row Level Security (RLS) MUST be enabled on all tables. No custom API routes for CRUD operations that Supabase handles directly. Server-side Supabase client MUST use cookie-based session management.

## Technology Stack

| Layer           | Technology            | Version        |
| --------------- | --------------------- | -------------- |
| Framework       | Next.js               | 16.1.6         |
| UI Library      | React                 | 19.2.3         |
| Styling         | Tailwind CSS          | v4             |
| Components      | shadcn/ui             | new-york style |
| Language        | TypeScript            | 5 (strict)     |
| Backend         | Supabase              | Latest         |
| State (client)  | Zustand               | Latest         |
| Forms           | react-hook-form + zod | Latest         |
| Data Fetching   | TanStack React Query  | Latest         |
| Package Manager | bun                   | Latest         |

## Project Structure

```
src/
├── app/              # Next.js App Router pages & layouts
│   ├── (auth)/       # Auth pages (login, signup)
│   ├── (dashboard)/  # Authenticated pages
│   └── globals.css   # Theme + Tailwind v4 config
├── components/
│   ├── ui/           # shadcn/ui components (DO NOT manually edit)
│   └── *.tsx         # App-specific components
├── lib/
│   ├── supabase/     # Supabase client + types
│   └── utils.ts      # cn() and shared utilities
├── stores/           # Zustand stores
└── providers/        # React context providers
```

Path alias: `@/` maps to `src/`.

## Quality Gates

- `bun run build` MUST pass with zero errors before any feature is considered complete
- `bun run lint` MUST pass with zero warnings
- All pages MUST be accessible via keyboard navigation
- All interactive elements MUST have appropriate ARIA attributes

## Governance

This constitution supersedes all other development practices for the Relay project. Amendments require:

1. Documentation of the proposed change
2. Justification explaining why the current principle is insufficient
3. Impact assessment on existing specs and implementations
4. Version bump following semver (MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications)

All specs, plans, and tasks MUST be validated against these principles before implementation begins.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
