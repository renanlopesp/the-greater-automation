# Contract — Asset Studio Types

**Feature**: 071-remove-any-casts
**Scope**: `src/components/asset-studio/types.ts`, `AssetCreatorModal.tsx`, consumers

## What callers can rely on

After this feature merges:

1. `AssetCreatorModal` accepts a fully-typed `AssetCreatorModalProps`. Omitting a required prop fails typecheck at the caller.
2. Canvas state is the discriminated-union `CanvasState` + `CanvasAction` in `src/components/asset-studio/types.ts`. Reducers use TypeScript exhaustive checks on `action.type`.
3. `CanvasProduct`, `ChannelAspectRatio`, `CanvasStyle`, `CanvasFont`, and `CanvasWidget` are exported for reuse by studio chat and AI prompt builders.

## Regression fixture

```ts
// src/components/asset-studio/__tests__/types.contract.ts
import type {
  AssetCreatorModalProps,
  CanvasAction,
  CanvasProduct,
  CanvasState,
  ChannelAspectRatio,
} from '@/components/asset-studio/types'

// Discriminated union must narrow.
function _reduce(_state: CanvasState, action: CanvasAction) {
  switch (action.type) {
    case 'set_heading':
      // value MUST be string
      return action.value.length
    case 'set_channel':
      // value MUST be ChannelAspectRatio
      const ch: ChannelAspectRatio = action.value
      return ch.length
    default:
      // Exhaustive check — if a new action is added and not handled, this line errors.
      const _exhaustive: never = action
      return _exhaustive
  }
}

// Omitting a required prop MUST NOT compile.
// @ts-expect-error — `onClose` is required
const _badProps: AssetCreatorModalProps = { open: true }
void _badProps

// A valid product MUST compile.
const _validProduct: CanvasProduct = {
  id: 'p1',
  productId: 'p1',
  name: 'Example',
  sku: 'SKU-1',
  imageUrl: null,
  source: 'seed',
}
void _validProduct
```

## Explicit non-contracts

- The exact list of string literals inside `ChannelAspectRatio` / `CanvasFont` may grow. Callers must not assume a closed set beyond checking against the exported type.
- Internal state reducers' memoisation keys are not a contract.
