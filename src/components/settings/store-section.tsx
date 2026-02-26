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
  { value: 'roupas', label: 'Clothing & Accessories' },
  { value: 'eletronicos', label: 'Electronics' },
  { value: 'alimentos', label: 'Food & Beverages' },
  { value: 'cosmeticos', label: 'Cosmetics & Beauty' },
  { value: 'casa_decoracao', label: 'Home & Decor' },
  { value: 'esportes', label: 'Sports & Fitness' },
  { value: 'brinquedos', label: 'Toys & Games' },
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
  { value: 'manual', label: 'No online store', available: true },
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
        <h2 className="text-lg font-semibold">Store</h2>
        <p className="text-muted-foreground text-sm">
          No store configured. Complete onboarding to get started.
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
      toast.success('Store info updated')
    } catch {
      toast.error('Failed to save store info')
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
      toast.success('Alerts updated')
    } catch {
      toast.error('Failed to save alerts')
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
      toast.success('Preferences updated')
    } catch {
      toast.error('Failed to save preferences')
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
      toast.success('Platform updated')
    } catch {
      toast.error('Failed to save platform')
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
      toast.error('Failed to connect platform')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <h2 className="text-lg font-semibold">Store</h2>

      {/* Store Info */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Store info</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="store-name">Store name</Label>
          <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger>
              <SelectValue placeholder="Select segment" />
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
          {savingInfo ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <hr className="border-border" />

      {/* Platform Connection */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Platform</h3>
        {isConnected ? (
          <div className="flex flex-col gap-3">
            <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
              <div>
                {storeData.platform === 'manual' ? (
                  <>
                    <p className="text-sm font-medium">Manual mode</p>
                    <p className="text-muted-foreground text-xs">
                      No online store connected. You can manage your products manually.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      {PLATFORM_LABELS[storeData.platform!] ?? storeData.platform} connected
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ID: {storeData.platform_store_id}
                      {storeData.last_sync_at && (
                        <> · Last sync: {new Date(storeData.last_sync_at).toLocaleString()}</>
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
              Change platform
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>E-commerce platform</Label>
              <Select value={platform} onValueChange={savePlatform} disabled={savingPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} disabled={!p.available}>
                      {p.label}
                      {!p.available && (
                        <span className="text-muted-foreground ml-2 text-xs">(Coming soon)</span>
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
                {connecting ? 'Connecting...' : 'Connect Nuvemshop'}
              </Button>
            )}
            {platform === 'shopify' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="shopify-subdomain">Shopify store subdomain</Label>
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
                  {connecting ? 'Connecting...' : 'Connect Shopify'}
                </Button>
              </div>
            )}
            {platform === 'mercadolivre' && (
              <p className="text-muted-foreground text-xs">
                Mercado Livre integration is not yet available. You&apos;ll be able to connect your
                account soon.
              </p>
            )}
            {platform === 'manual' && (
              <p className="text-muted-foreground text-xs">
                No online store connected. You can manage your products manually.
              </p>
            )}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Alert Settings */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Stock alerts</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="threshold">Global low stock threshold</Label>
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
            You&apos;ll receive an alert when stock falls below this value.
          </p>
        </div>
        <Button onClick={saveAlerts} className="w-fit" disabled={savingAlerts}>
          {savingAlerts && <Loader2 className="animate-spin" />}
          {savingAlerts ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <hr className="border-border" />

      {/* Notification Preferences */}
      <div className="flex max-w-md flex-col gap-4">
        <h3 className="text-sm font-medium">Telegram notifications</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">New orders</p>
            <p className="text-muted-foreground text-xs">Instant notification for each order</p>
          </div>
          <Switch checked={orderNotifications} onCheckedChange={setOrderNotifications} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Daily sales summary</p>
            <p className="text-muted-foreground text-xs">
              Automatic summary of the day&apos;s sales
            </p>
          </div>
          <Switch checked={dailySummary} onCheckedChange={setDailySummary} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Abandoned cart alerts</p>
            <p className="text-muted-foreground text-xs">
              Notify when a customer abandons checkout
            </p>
          </div>
          <Switch
            checked={abandonedCartNotifications}
            onCheckedChange={setAbandonedCartNotifications}
          />
        </div>
        {abandonedCartNotifications && (
          <div className="flex flex-col gap-2">
            <Label>Minimum abandonment time</Label>
            <Select value={abandonedCartDelay} onValueChange={setAbandonedCartDelay}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {dailySummary && (
          <div className="flex flex-col gap-2">
            <Label>Summary time</Label>
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
          {savingNotifications ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
