# Relay

## Codebase Overview

Next.js 16 application with shadcn/ui components, React 19, Tailwind CSS v4, and TypeScript in strict mode. Uses the App Router with Server Components by default.

**Stack**: Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, shadcn/ui (new-york style), Radix UI, TypeScript 5
**Structure**: `src/app/` (pages & layouts), `src/components/ui/` (shadcn components), `src/lib/` (utilities)

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Key Conventions

- Path alias `@/` maps to `src/`
- Use `cn()` from `@/lib/utils` for all dynamic className composition
- Server Components by default; only add `"use client"` when necessary
- Theme configured via CSS variables in `src/app/globals.css` (OKLCH color space)
- Add shadcn components via `npx shadcn@latest add <component>`
- Tailwind v4 CSS-first config (no `tailwind.config.js`)

## Scripts

- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
