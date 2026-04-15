'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  AssetCreatorModal,
  type AssetCreatorData,
} from '@/components/asset-studio/AssetCreatorModal'
import { loadStoreContext } from '@/lib/studio/store-context'
import { StudioSessionProvider } from '@/lib/studio/session-context'

const RESTORE_ITEM_KEY = 'snew:studio-restore-item'

function StudioCreatePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mountKey, setMountKey] = useState(() => searchParams.get('_ts') ?? Date.now().toString())

  const autoPrompt = searchParams.get('autoPrompt') ?? ''
  const openBoard = searchParams.get('openBoard') === 'true'
  const styleId = searchParams.get('styleId')
  const styleName = searchParams.get('styleName')
  const styleDesc = searchParams.get('styleDesc')

  const [restoreItem, setRestoreItem] = useState<{
    sessionTitle?: string
    imageUrl?: string
    chatMessages?: unknown[]
  } | null>(null)

  // Load restore payload from sessionStorage when the URL asks for it.
  // useEffect is required because sessionStorage is a browser-only side-effect
  // source and we must also consume-and-clear the entry.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = searchParams.get('restore')
    if (!flag) return
    try {
      const raw = sessionStorage.getItem(RESTORE_ITEM_KEY)
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from sessionStorage after mount
        setRestoreItem(JSON.parse(raw))
        sessionStorage.removeItem(RESTORE_ITEM_KEY)
      }
    } catch {}
    setMountKey(Date.now().toString())
  }, [searchParams])

  const storeCtx = useMemo(() => loadStoreContext(), [])

  const studioData: AssetCreatorData = useMemo(
    () => ({
      campaignTitle: restoreItem?.sessionTitle ?? storeCtx?.name ?? '',
      product: storeCtx?.productTypes?.[0] ?? '',
      productImageUrl: restoreItem?.imageUrl ?? '',
      copyText: '',
      selectedTone: storeCtx?.tone ?? '',
      autoPrompt,
      restoreChatMessages: restoreItem?.chatMessages,
      styleId: styleId ?? null,
      styleName: styleName ?? null,
      styleDesc: styleDesc ?? null,
    }),
    [restoreItem, storeCtx, autoPrompt, styleId, styleName, styleDesc]
  )

  return (
    <StudioSessionProvider replaceUrlOnCreate>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <AssetCreatorModal
          key={mountKey}
          data={studioData}
          onClose={() => router.push('/studio')}
          embedded
          initialBoardMode={openBoard}
        />
      </div>
    </StudioSessionProvider>
  )
}

export default function StudioCreatePage() {
  return (
    <Suspense>
      <StudioCreatePageInner />
    </Suspense>
  )
}
