# Quickstart — Remove `any` Casts

**Feature**: 071-remove-any-casts
**Audience**: the engineer or agent implementing a task from `tasks.md`.

## TL;DR flow

```
1. regenerate DB types    →  bunx supabase gen types typescript --linked > src/types/database.ts
2. pick a hotspot file    →  see tasks.md order
3. remove `as any`        →  let tsc --noEmit surface the real error
4. fix the real error     →  rename column, reshape select, or add a typed wrapper
5. repeat                 →  until the file is clean
6. verify                 →  bunx tsc --noEmit (no new errors) + bun test (513 pass)
```

## Before starting any task

- Confirm you are on branch `071-remove-any-casts` (or a child branch).
- Confirm all migrations in `supabase/migrations/` are applied in the linked Supabase project. If not, stop and ask (do not regenerate types against a stale DB).
- Baseline count: `rg "as any|: any" src --glob '!**/__tests__/**' --glob '!**/*.d.ts' | wc -l` — track progress vs. 349.

## Regenerating DB types (do once at start of P1)

```bash
# confirm linked project is the expected one
bunx supabase status

# regenerate (writes to new canonical path)
bunx supabase gen types typescript --linked > src/types/database.ts

# remove the stale file
git rm src/lib/supabase/database.types.ts

# update imports: one-liner sed
rg -l "from.*['\"]@/lib/supabase/database\.types['\"]" src \
  | xargs sed -i "s|@/lib/supabase/database\.types|@/types/database|g"
```

Commit this as the first commit of the P1 PR. `tsc --noEmit` after this commit will light up all ~60 API handlers that were casting around the old type — that is expected; the remaining commits in the PR fix them one by one.

## Removing a cast — the safe recipe

Per file:

1. Delete the `as any` (or `: any`). Leave the rest of the line as-is.
2. Run `bunx tsc --noEmit | grep <file>`.
3. Read the first real error.
4. Fix by one of these, in order of preference:
   a. Narrowing the generic — e.g., `.from('agents').select('id, report_kind')` (let the generated type do the work).
   b. Adding a typed RPC wrapper — if the error is on an `.rpc()` call, wrap it per data-model §T-8.
   c. Introducing a `zod.parse()` step — only if the value crosses a trust boundary (Supabase `Json` column, user input, external API).
   d. Keeping the cast with a `// any: <marker>` comment — **last resort**, and only for the three documented markers.

5. Re-run `tsc --noEmit`.
6. Repeat until the file has zero errors.

## Comment taxonomy for surviving casts

Per data-model §T-9, only three markers are allowed:

- `// any: upstream-sdk` — third-party library's type is genuinely wrong.
- `// any: generated-types-mismatch` — migration added something the Supabase generator can't express. Must be paired with a tracked issue.
- `// any: test-fixture` — only under `__tests__/`.

Anything else is rejected in review.

## Validating before opening a PR

```bash
# Type check — must be clean (no new errors, pre-existing test errors may remain)
bunx tsc --noEmit

# Count check — expect monotonic progress toward <20
rg "as any|: any" src --glob '!**/__tests__/**' --glob '!**/*.d.ts' | wc -l

# Verify all remaining casts are labelled
rg "as any|: any" src --glob '!**/__tests__/**' --glob '!**/*.d.ts' -n \
  | rg -v '// any:' \
  && echo 'UNLABELLED CASTS FOUND' || echo 'ALL LABELLED'

# Tests pass unchanged
bun test
```

## PR sequencing

| PR  | Scope                                                                                                                      | Expected cast reduction | LOC budget |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------- |
| P1  | `src/types/database.ts` regen + client factories + all `src/app/api/**` + `src/lib/queries/` + `src/lib/**` Supabase calls | 349 → ~110              | ≤800       |
| P2  | `src/components/asset-studio/**` (modal, canvas types, chat panel)                                                         | ~110 → ~25              | ≤800       |
| P3  | `src/lib/ai/**`, `src/lib/composio/**`, `src/hooks/**`, `studioSupabase`, ESLint flip                                      | ~25 → <20               | ≤500       |

Each PR MUST be independently mergeable. If P2 is stuck in review, P3 can queue behind it against P2's branch.

## Rollback

Each PR is a no-op at runtime. To roll back: `git revert <merge-commit>`. No data migration, no config change. The only cross-PR dependency is that P2 and P3 import types from the P1-created `src/types/database.ts`; if P1 is rolled back, P2 and P3 revert with it.

## Constitution checkpoints

Before opening each PR, verify:

- Principle I–III, VI: no change expected. If your diff touches routing, components, styling, or Supabase backend choice, stop.
- Principle IV: `any` count must strictly decrease. No PR should add untyped casts.
- Principle V: no new helper types beyond those listed in `data-model.md`. If you feel one is needed, document the inability before adding it.

## Gotchas

- **Supabase generator quirks**: `jsonb` columns generate as `Json` (recursive type). To narrow, use `z.object(...)` at the read site.
- **Branded never types**: if you see `never` where you expect a row type, the generated `Database` is stale — regenerate. Do not cast.
- **RLS error surface**: typed clients do not change RLS; errors still come back at runtime. Keep error-handling code intact.
- **Browser vs server clients**: keep them separate — the browser client is strictly anon-key only; the service-role client must never end up in a `'use client'` file.
