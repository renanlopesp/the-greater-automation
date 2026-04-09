'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { AssetCreatorModal, type AssetCreatorData } from '@/components/asset-studio/AssetCreatorModal'

function StudioPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState(true)
  const autoPrompt = searchParams.get('autoPrompt') ?? ''

  const studioData: AssetCreatorData = {
    campaignTitle: '',
    product: '',
    productImageUrl: '',
    copyText: '',
    selectedTone: '',
    autoPrompt,
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      <AssetCreatorModal
        data={studioData}
        onClose={() => router.push('/')}
        embedded
      />
    </div>
  )
}

export default function StudioPage() {
  return (
    <Suspense>
      <StudioPageInner />
    </Suspense>
  )
}
