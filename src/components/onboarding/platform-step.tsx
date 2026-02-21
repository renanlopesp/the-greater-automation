'use client'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '@/lib/retail/segment-skills'

interface PlatformStepProps {
  platform: Platform | null
  platformUrl: string
  onPlatformChange: (value: Platform) => void
  onUrlChange: (value: string) => void
}

const PLATFORM_ICONS: Record<Platform, string> = {
  nuvemshop: '☁️',
  shopify: '🛒',
  mercadolivre: '🤝',
  manual: '📋',
}

export function PlatformStep({
  platform,
  platformUrl,
  onPlatformChange,
  onUrlChange,
}: PlatformStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Onde fica sua loja online?</h2>
        <p className="text-muted-foreground">
          Conectamos com sua plataforma para sincronizar produtos e pedidos.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPlatformChange(p)}
            className={cn(
              'hover:bg-accent flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
              platform === p && 'border-primary bg-accent'
            )}
          >
            <span className="text-2xl">{PLATFORM_ICONS[p]}</span>
            <span className="text-sm font-medium">{PLATFORM_LABELS[p]}</span>
          </button>
        ))}
      </div>
      {platform && platform !== 'manual' && (
        <div className="space-y-2">
          <Label htmlFor="platform-url">URL da sua loja</Label>
          <Input
            id="platform-url"
            placeholder={`Ex: https://minhaloja.${platform === 'nuvemshop' ? 'nuvemshop.com.br' : platform === 'shopify' ? 'myshopify.com' : 'mercadolivre.com.br'}`}
            value={platformUrl}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
