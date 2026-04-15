'use client'

import { loadStoreContext } from '@/lib/studio/store-context'

export function getHistoryKey(): string {
  const storeCtx = loadStoreContext()
  const storeSlug = storeCtx?.name
    ? storeCtx.name.toLowerCase().replace(/\s+/g, '-').slice(0, 24)
    : 'default'
  return `snew_asset_history_${storeSlug}`
}

/** Remove legacy "snew_asset_history" key if store is configured */
export function migrateLegacyHistory(): void {
  if (typeof window === 'undefined') return
  try {
    const storeCtx = loadStoreContext()
    if (storeCtx?.name) {
      const legacyKey = 'snew_asset_history'
      const legacy = localStorage.getItem(legacyKey)
      if (legacy) {
        localStorage.removeItem(legacyKey)
      }
    }
  } catch {}
}
