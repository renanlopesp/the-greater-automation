'use client'

import { useState } from 'react'
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react'
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

const SEGMENTS = [
  { value: 'roupas', label: 'Roupas e Moda' },
  { value: 'eletronicos', label: 'Eletrônicos' },
  { value: 'alimentos', label: 'Alimentos e Bebidas' },
  { value: 'cosmeticos', label: 'Cosméticos e Beleza' },
  { value: 'casa_decoracao', label: 'Casa e Decoração' },
  { value: 'esportes', label: 'Esportes e Fitness' },
  { value: 'brinquedos', label: 'Brinquedos e Games' },
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

export default function StoreSection({ storeData }: StoreSectionProps) {
  // Store info form
  const [storeName, setStoreName] = useState(storeData?.name ?? '')
  const [segment, setSegment] = useState(storeData?.segment ?? '')
  const [savingInfo, setSavingInfo] = useState(false)

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
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [syncing, setSyncing] = useState(false)

  if (!storeData) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Loja</h2>
        <p className="text-muted-foreground text-sm">
          Nenhuma loja configurada. Complete o onboarding para começar.
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
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Dados da loja atualizados')
    } catch {
      toast.error('Erro ao salvar dados da loja')
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
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Alertas atualizados')
    } catch {
      toast.error('Erro ao salvar alertas')
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
          },
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Preferências atualizadas')
    } catch {
      toast.error('Erro ao salvar preferências')
    } finally {
      setSavingNotifications(false)
    }
  }

  const triggerSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/nuvemshop/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao sincronizar')
      const data = (await res.json()) as { products_synced?: number }
      toast.success(`Sincronização concluída: ${data.products_synced ?? 0} produtos`)
    } catch {
      toast.error('Erro ao sincronizar produtos')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <h2 className="text-lg font-semibold">Loja</h2>

      {/* Store Info */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Dados da loja</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="store-name">Nome da loja</Label>
          <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Segmento</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o segmento" />
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
        {storeData.platform && storeData.platform_store_id ? (
          <div className="flex flex-col gap-3">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <div>
                <p className="text-sm font-medium capitalize">{storeData.platform} conectada</p>
                <p className="text-muted-foreground text-xs">
                  ID: {storeData.platform_store_id}
                  {storeData.last_sync_at && (
                    <> · Última sync: {new Date(storeData.last_sync_at).toLocaleString('pt-BR')}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={triggerSync} disabled={syncing}>
                {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">Nenhuma plataforma conectada.</p>
            <Button variant="outline" className="w-fit" asChild>
              <a href="/api/nuvemshop/connect?redirect_uri=/workspace">
                <ExternalLink className="h-4 w-4" />
                Conectar Nuvemshop
              </a>
            </Button>
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
            Você receberá um alerta quando o estoque ficar abaixo desse valor.
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
        <h3 className="text-sm font-medium">Notificações Telegram</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Novos pedidos</p>
            <p className="text-muted-foreground text-xs">Notificação instantânea de cada pedido</p>
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
