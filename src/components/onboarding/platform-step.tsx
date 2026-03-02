'use client'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import {
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_AVAILABLE,
  type Platform,
} from '@/lib/retail/segment-skills'

interface PlatformStepProps {
  platform: Platform | null
  platformUrl: string
  nuvemshopConnected: boolean
  onPlatformChange: (value: Platform) => void
  onUrlChange: (value: string) => void
  onConnectNuvemshop: () => void
  connectingNuvemshop?: boolean
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
  nuvemshopConnected,
  onPlatformChange,
  onUrlChange,
  onConnectNuvemshop,
  connectingNuvemshop,
}: PlatformStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Onde fica sua loja online?</h2>
        <p className="text-muted-foreground">
          Conectamos à sua plataforma para sincronizar produtos e pedidos.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => {
          const available = PLATFORM_AVAILABLE[p]
          return (
            <button
              key={p}
              type="button"
              onClick={() => available && onPlatformChange(p)}
              disabled={!available}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                available && 'hover:bg-accent',
                !available && 'cursor-not-allowed opacity-50',
                platform === p && available && 'border-primary bg-accent'
              )}
            >
              <span className="text-2xl">{PLATFORM_ICONS[p]}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{PLATFORM_LABELS[p]}</span>
                {!available && <span className="text-muted-foreground text-xs">Em breve</span>}
              </div>
            </button>
          )
        })}
      </div>

      {platform === 'nuvemshop' && (
        <div className="space-y-2">
          {nuvemshopConnected ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Nuvemshop conectada
              </span>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={onConnectNuvemshop}
              disabled={connectingNuvemshop}
            >
              {connectingNuvemshop ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Conectar sua loja Nuvemshop
            </Button>
          )}
        </div>
      )}

      {platform === 'shopify' && (
        <div className="space-y-2">
          <Label htmlFor="platform-url">URL da sua loja</Label>
          <Input
            id="platform-url"
            placeholder="Ex: https://minhaloja.myshopify.com"
            value={platformUrl}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
