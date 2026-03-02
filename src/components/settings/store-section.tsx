'use client'

import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { initiateAppConnection } from '@/lib/composio/actions/initiate-connection'

const PLATFORM_LABELS: Record<string, string> = {
  nuvemshop: 'Nuvemshop',
  shopify: 'Shopify',
  mercadolivre: 'Mercado Livre',
  manual: 'Manual',
}

const SEGMENTS = [
  { value: 'roupas', label: 'Moda e Acessórios' },
  { value: 'eletronicos', label: 'Eletrônicos' },
  { value: 'alimentos', label: 'Alimentos e Bebidas' },
  { value: 'cosmeticos', label: 'Cosméticos e Beleza' },
  { value: 'casa_decoracao', label: 'Casa e Decoração' },
  { value: 'esportes', label: 'Esportes e Fitness' },
  { value: 'brinquedos', label: 'Brinquedos e Jogos' },
  { value: 'pet', label: 'Pet Shop' },
]

const SUMMARY_HOURS = [
  { value: '18', label: '18:00' },
  { value: '19', label: '19:00' },
  { value: '20', label: '20:00' },
  { value: '21', label: '21:00' },
  { value: '22', label: '22:00' },
]

interface StoreData {
  id: string
  name: string
  segment: string
  platform: string | null
  platform_store_id: string | null
  last_sync_at: string | null
  settings: Record<string, unknown> | null
}

interface StoreSectionProps {
  storeData: StoreData | null
  teamId?: string
}

const PLATFORM_OPTIONS = [
  { value: 'shopify', label: 'Shopify', available: true },
  { value: 'nuvemshop', label: 'Nuvemshop', available: true },
  { value: 'mercadolivre', label: 'Mercado Livre', available: false },
  { value: 'manual', label: 'Sem loja online', available: true },
]

export default function StoreSection({ storeData, teamId }: StoreSectionProps) {
  // Store info form
  const [storeName, setStoreName] = useState(storeData?.name ?? '')
  const [segment, setSegment] = useState(storeData?.segment ?? '')
  const [savingInfo, setSavingInfo] = useState(false)

  // Platform
  const [platform, setPlatform] = useState(storeData?.platform ?? 'manual')
  const [savingPlatform, setSavingPlatform] = useState(false)

  // Alert settings
  const [threshold, setThreshold] = useState(5)
  const [savingAlerts, setSavingAlerts] = useState(false)

  // Notification prefs
  const settings = (storeData?.settings ?? {}) as Record<string, unknown>
  const [orderNotifications, setOrderNotifications] = useState(
    settings.order_notifications_enabled !== false
  )
  const [dailySummary, setDailySummary] = useState(settings.daily_summary_enabled !== false)
  const [summaryHour, setSummaryHour] = useState(String(settings.daily_summary_hour ?? 21))
  const [abandonedCartNotifications, setAbandonedCartNotifications] = useState(
    settings.abandoned_cart_notifications_enabled !== false
  )
  const [abandonedCartDelay, setAbandonedCartDelay] = useState(
    String(settings.abandoned_cart_delay_minutes ?? 60)
  )
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [shopifySubdomain, setShopifySubdomain] = useState('')
  const [changingPlatform, setChangingPlatform] = useState(false)

  const isConnected =
    !changingPlatform && (!!storeData?.platform_store_id || storeData?.platform === 'manual')

  if (!storeData) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Loja</h2>
        <p className="text-muted-foreground text-sm">
          Nenhuma loja configurada. Conclua o onboarding para começar.
        </p>
      </div>
    )
  }

  const saveStoreInfo = async () => {
    setSavingInfo(true)
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: storeName, segment }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Informações da loja atualizadas')
    } catch {
      toast.error('Falha ao salvar informações da loja')
    } finally {
      setSavingInfo(false)
    }
  }

  const saveAlerts = async () => {
    setSavingAlerts(true)
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_threshold: threshold }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Alertas atualizados')
    } catch {
      toast.error('Falha ao salvar alertas')
    } finally {
      setSavingAlerts(false)
    }
  }

  const saveNotifications = async () => {
    setSavingNotifications(true)
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            order_notifications_enabled: orderNotifications,
            daily_summary_enabled: dailySummary,
            daily_summary_hour: parseInt(summaryHour),
            abandoned_cart_notifications_enabled: abandonedCartNotifications,
            abandoned_cart_delay_minutes: parseInt(abandonedCartDelay),
          },
          // Also update Sales Analyst agent's notification_settings
          agent_notifications: {
            daily_summary_enabled: dailySummary,
            report_hour: parseInt(summaryHour),
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Preferências atualizadas')
    } catch {
      toast.error('Falha ao salvar preferências')
    } finally {
      setSavingNotifications(false)
    }
  }

  const savePlatform = async (value: string) => {
    setPlatform(value)
    setSavingPlatform(true)
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: value }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Plataforma atualizada')
    } catch {
      toast.error('Falha ao salvar plataforma')
    } finally {
      setSavingPlatform(false)
    }
  }

  const connectViaComposio = async (appId: string, connectionData?: Record<string, unknown>) => {
    setConnecting(true)
    try {
      const result = await initiateAppConnection(appId, undefined, connectionData)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      window.location.href = result.redirectUrl
    } catch {
      toast.error('Falha ao conectar plataforma')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <h2 className="text-lg font-semibold">Loja</h2>

      {/* Store Info */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Informações da loja</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar segmento" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveStoreInfo} className="w-fit" disabled={savingInfo}>
          {savingInfo && <Loader2 className="animate-spin" />}
          {savingInfo ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <hr className="border-border" />

      {/* Platform Connection */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Plataforma</h3>
        {isConnected ? (
          <div className="flex flex-col gap-3">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <div>
                {storeData.platform === 'manual' ? (
                  <>
                    <p className="text-sm font-medium">Modo manual</p>
                    <p className="text-muted-foreground text-xs">
                      Nenhuma loja online conectada. Você pode gerenciar seus produtos manualmente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {PLATFORM_LABELS[storeData.platform!] ?? storeData.platform} conectado
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ID: {storeData.platform_store_id}
                      {storeData.last_sync_at && (
                        <>
                          {' '}
                          · Última sincronização:{' '}
                          {new Date(storeData.last_sync_at).toLocaleString()}
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
            {/* Sync button placeholder for future platform sync */}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground w-fit text-xs"
              onClick={() => setChangingPlatform(true)}
            >
              Trocar plataforma
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>Plataforma de e-commerce</Label>
              <Select value={platform} onValueChange={savePlatform} disabled={savingPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} disabled={!p.available}>
                      {p.label}
                      {!p.available && (
                        <span className="text-muted-foreground ml-2 text-xs">(Em breve)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {platform === 'nuvemshop' && (
              <Button
                variant="outline"
                className="w-fit"
                onClick={() => {
                  setConnecting(true)
                  const params = new URLSearchParams({
                    redirect_uri: '/workspace?open_settings=store',
                    ...(teamId && { team_id: teamId }),
                  })
                  window.location.href = `/api/nuvemshop/connect?${params}`
                }}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {connecting ? 'Conectando...' : 'Conectar Nuvemshop'}
              </Button>
            )}
            {platform === 'shopify' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="shopify-subdomain">Subdomínio da loja Shopify</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="shopify-subdomain"
                      placeholder="my-store"
                      value={shopifySubdomain}
                      onChange={(e) => setShopifySubdomain(e.target.value.trim())}
                      className="w-48"
                    />
                    <span className="text-muted-foreground text-xs">.myshopify.com</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={() => connectViaComposio('shopify', { subdomain: shopifySubdomain })}
                  disabled={connecting || !shopifySubdomain}
                >
                  {connecting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {connecting ? 'Conectando...' : 'Conectar Shopify'}
                </Button>
              </div>
            )}
            {platform === 'mercadolivre' && (
              <p className="text-muted-foreground text-xs">
                A integração com o Mercado Livre ainda não está disponível. Em breve você poderá
                conectar sua conta.
              </p>
            )}
            {platform === 'manual' && (
              <p className="text-muted-foreground text-xs">
                Nenhuma loja online conectada. Você pode gerenciar seus produtos manualmente.
              </p>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Alert Settings */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Alertas de estoque</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="threshold">Limite global de estoque baixo</Label>
          <Input
            id="threshold"
            type="number"
            min={1}
            max={1000}
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 5)}
            className="w-24"
          />
          <p className="text-muted-foreground text-xs">
            Você receberá um alerta quando o estoque ficar abaixo deste valor.
          </p>
        </div>
        <Button onClick={saveAlerts} className="w-fit" disabled={savingAlerts}>
          {savingAlerts && <Loader2 className="animate-spin" />}
          {savingAlerts ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <hr className="border-border" />

      {/* Notification Preferences */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Notificações no Telegram</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Novos pedidos</p>
            <p className="text-muted-foreground text-xs">Notificação imediata para cada pedido</p>
          </div>
          <Switch checked={orderNotifications} onCheckedChange={setOrderNotifications} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Resumo diário de vendas</p>
            <p className="text-muted-foreground text-xs">Resumo automático das vendas do dia</p>
          </div>
          <Switch checked={dailySummary} onCheckedChange={setDailySummary} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Alertas de carrinho abandonado</p>
            <p className="text-muted-foreground text-xs">
              Notificar quando um cliente abandonar o checkout
            </p>
          </div>
          <Switch
            checked={abandonedCartNotifications}
            onCheckedChange={setAbandonedCartNotifications}
          />
        </div>
        {abandonedCartNotifications && (
          <div className="flex flex-col gap-2">
            <Label>Tempo mínimo de abandono</Label>
            <Select value={abandonedCartDelay} onValueChange={setAbandonedCartDelay}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {dailySummary && (
          <div className="flex flex-col gap-2">
            <Label>Horário do resumo</Label>
            <Select value={summaryHour} onValueChange={setSummaryHour}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_HOURS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={saveNotifications} className="w-fit" disabled={savingNotifications}>
          {savingNotifications && <Loader2 className="animate-spin" />}
          {savingNotifications ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
