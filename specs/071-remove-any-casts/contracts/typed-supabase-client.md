# Contract — Typed Supabase Client

**Feature**: 071-remove-any-casts
**Scope**: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/types/database.ts`

## What callers can rely on

After this feature merges:

1. `createServerClient()` returns `Promise<SupabaseClient<Database>>`. Callers await and use the client without any cast.
2. `createServiceRoleClient()` returns `SupabaseClient<Database>`.
3. `.from('<exact_table_name>').select('<exact_column_list>')` is fully type-checked at compile time — including nested JSON columns when their shape is in the generated `Database`.
4. `.rpc('<rpc_name>', <args>)` is checked against `Database['public']['Functions']`. For the six custom RPCs (see data-model §T-8), thin wrappers expose a more ergonomic API but internally delegate to `.rpc()` with the generated types.

## Regression fixture (ts-expect-error tests)

This feature adds a compile-time fixture at `src/lib/supabase/__tests__/types.contract.ts`. It is **not** executed at runtime — `tsc` alone validates it. If a future change regresses these contracts, `bun run build` fails.

```ts
// src/lib/supabase/__tests__/types.contract.ts
// Pins the public type contract of the Supabase client factories.
// DO NOT EDIT lightly — changes here imply a breaking type change.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'

// Return types MUST be a typed Supabase client over the generated Database.
type _Server = Awaited<ReturnType<typeof createServerClient>>
const _serverAssert: SupabaseClient<Database> = {} as _Server

type _Service = ReturnType<typeof createServiceRoleClient>
const _serviceAssert: SupabaseClient<Database> = {} as _Service

// Selecting a valid column on a valid table MUST compile.
async function _validSelect() {
  const s = await createServerClient()
  const { data } = await s.from('agents').select('id, report_kind').limit(1)
  // `data[0].report_kind` narrows to the enum, not any.
  const _row: { id: string; report_kind: 'stock' | 'price' | 'sales' | null } | undefined =
    data?.[0]
  void _row
}

// Selecting an invalid column on a valid table MUST NOT compile.
async function _invalidSelectShouldFail() {
  const s = await createServerClient()
  // @ts-expect-error — column does not exist
  await s.from('agents').select('this_column_does_not_exist')
}

// `.from('<invalid_table>')` MUST NOT compile.
async function _invalidTableShouldFail() {
  const s = await createServerClient()
  // @ts-expect-error — table not in Database['public']['Tables']
  await s.from('table_does_not_exist').select('*')
}
```

Any change that regresses the typed client will fail the `@ts-expect-error` lines (because the expected error disappears).

## Explicit non-contracts

The following are **not** stable contracts — callers must not rely on them:

- The exact name of the generated types file path (we may move it again).
- The generated type shape of `jsonb` columns (Supabase's generator emits `Json` for these today; in the future a custom JSON schema could refine them).
- The exact stack trace format inside the `Database` type.
