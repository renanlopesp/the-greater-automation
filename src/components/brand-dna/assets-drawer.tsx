'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface AssetsDrawerProps {
  open: boolean
  onClose: () => void
  storeName: string
  tone?: string
  wordsToUse?: string[]
  wordsToAvoid?: string[]
  positioning?: string
}

type TabId = 'paleta' | 'tom' | 'textos'

const TABS: { id: TabId; label: string }[] = [
  { id: 'paleta', label: 'Paleta' },
  { id: 'tom', label: 'Tom de voz' },
  { id: 'textos', label: 'Textos' },
]

export function AssetsDrawer({
  open,
  onClose,
  storeName,
  tone,
  wordsToUse = [],
  wordsToAvoid = [],
  positioning,
}: AssetsDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paleta')

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <SheetContent side="right" showCloseButton={false} className="w-[360px] p-0 sm:max-w-[360px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-foreground text-[14px] font-semibold">Assets da {storeName}</span>
          <SheetClose asChild>
            <button
              onClick={onClose}
              className="text-muted-foreground transition-opacity hover:opacity-70"
            >
              <X size={16} />
              <span className="sr-only">Fechar</span>
            </button>
          </SheetClose>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b px-5 pt-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-2.5 text-[13px] font-medium transition-colors',
                activeTab === tab.id
                  ? 'text-foreground border-b-2 border-current'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto p-5" style={{ height: 'calc(100% - 105px)' }}>
          {activeTab === 'paleta' && <PaletaTab tone={tone} positioning={positioning} />}
          {activeTab === 'tom' && (
            <TomTab wordsToUse={wordsToUse} wordsToAvoid={wordsToAvoid} tone={tone} />
          )}
          {activeTab === 'textos' && <TextosTab positioning={positioning} tone={tone} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function PaletaTab({ tone, positioning }: { tone?: string; positioning?: string }) {
  const description = [tone, positioning].filter(Boolean).join(' — ')
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        Imagens dos produtos serão exibidas aqui após a análise completa.
      </p>
      {description && (
        <div className="rounded-xl border p-4">
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Tema visual da marca
          </span>
          <p className="text-foreground text-[13px] leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}

function TomTab({
  wordsToUse,
  wordsToAvoid,
  tone,
}: {
  wordsToUse: string[]
  wordsToAvoid: string[]
  tone?: string
}) {
  return (
    <div className="flex flex-col gap-5">
      {tone && (
        <div>
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Tom de comunicação
          </span>
          <p className="text-foreground text-[13px] leading-relaxed">{tone}</p>
        </div>
      )}

      {wordsToUse.length > 0 && (
        <div>
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Usar
          </span>
          <div className="flex flex-wrap gap-2">
            {wordsToUse.map((word) => (
              <span
                key={word}
                className="rounded-full bg-green-50 px-3 py-1 text-[12px] font-medium text-green-700"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {wordsToAvoid.length > 0 && (
        <div>
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Evitar
          </span>
          <div className="flex flex-wrap gap-2">
            {wordsToAvoid.map((word) => (
              <span
                key={word}
                className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-medium text-red-700"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {wordsToUse.length === 0 && wordsToAvoid.length === 0 && !tone && (
        <p className="text-muted-foreground text-[13px]">Análise de tom de voz não disponível.</p>
      )}
    </div>
  )
}

function TextosTab({ positioning, tone }: { positioning?: string; tone?: string }) {
  if (!positioning && !tone) {
    return (
      <p className="text-muted-foreground text-[13px]">Análise de posicionamento não disponível.</p>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {positioning && (
        <div>
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Posicionamento
          </span>
          <p className="text-foreground text-[13px] leading-relaxed">{positioning}</p>
        </div>
      )}
      {tone && (
        <div>
          <span className="text-muted-foreground mb-2 block text-[11px] font-semibold tracking-[0.05em] uppercase">
            Tom de voz
          </span>
          <p className="text-foreground text-[13px] leading-relaxed">{tone}</p>
        </div>
      )}
    </div>
  )
}
