# \_shared

Deno modules imported by skill Edge Functions in `supabase/functions/generate-*`.

## Rules

- Pure Deno. Do NOT import from Next.js `src/` — these modules run in Deno runtime.
- No Node-specific APIs (no `fs`, no `buffer`, no `crypto.randomUUID` via node:).
- Use `npm:` or `https://deno.land/std@*` imports.
- Each shared helper should be small and single-purpose.

## Structure (populated by spec 064 foundational phase)

- `supabase.ts` — service-role Supabase client factory
- `anthropic.ts` — thin wrapper over Messages API + generateObject pattern
- `nuvemshop.ts` — fetch products / store info
- `brand-dna.ts` — load brand DNA + store for a team
- `errors.ts` — `failTask()` helper + structured `log()`
