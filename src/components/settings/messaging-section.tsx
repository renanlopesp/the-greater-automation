'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Copy, Loader2, MessageCircle, Phone, Unlink } from 'lucide-react'

type LinkStatus =
  | { status: 'not_linked' }
  | { status: 'pending'; linkId: string }
  | {
      status: 'linked'
      linkId: string
      externalUsername: string | null
      conversationId: string | null
      createdAt: string
    }

type WhatsAppStatus =
  | { status: 'not_linked' }
  | { status: 'pending'; linkId: string }
  | {
      status: 'linked'
      linkId: string
      phoneNumber: string | null
      conversationId: string | null
      createdAt: string
    }

type QrStatus = {
  status: 'disconnected' | 'qr_pending' | 'connecting' | 'connected'
  qrCode?: string
  phoneNumber?: string
}

// --- Telegram Section ---

function TelegramSection() {
  const [code, setCode] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: linkStatus = null } = useQuery<LinkStatus>({
    queryKey: ['messaging-link', 'telegram'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/link?channel=telegram')
      const data = (await res.json()) as LinkStatus
      if (data.status === 'linked') setCode(null)
      return data
    },
    refetchInterval: code ? 3000 : false,
    refetchIntervalInBackground: false,
  })

  async function handleGenerateCode() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/link?channel=telegram', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Falha ao gerar código')
        return
      }
      setCode(data.code)
      setInstructions(data.instructions)
      queryClient.invalidateQueries({ queryKey: ['messaging-link', 'telegram'] })
    } catch {
      setError('Falha ao gerar código')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleUnlink() {
    setIsUnlinking(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/link?channel=telegram', { method: 'DELETE' })
      if (!res.ok) {
        setError('Falha ao desvincular')
        return
      }
      queryClient.setQueryData(['messaging-link', 'telegram'], { status: 'not_linked' })
      setCode(null)
    } catch {
      setError('Falha ao desvincular')
    } finally {
      setIsUnlinking(false)
    }
  }

  function handleCopyCode() {
    if (!code) return
    navigator.clipboard.writeText(`/link ${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {!linkStatus && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}

      {linkStatus?.status === 'linked' && (
        <div className="flex flex-col gap-4">
          <div className="border-border rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                <span className="font-medium">Telegram Conectado</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Ativo
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Seu Telegram está vinculado ao seu workspace. Você pode gerenciar agentes, automações
              e skills diretamente pelo Telegram.
            </p>
            <div className="bg-muted mt-4 rounded-lg p-4 text-sm">
              {linkStatus.externalUsername && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram</span>
                  <span className="font-medium">@{linkStatus.externalUsername}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Vinculado</span>
                <span className="font-medium">
                  {new Date(linkStatus.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="text-destructive"
            >
              {isUnlinking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 size-4" />
              )}
              Desvincular Telegram
            </Button>
          </div>
        </div>
      )}

      {linkStatus && (linkStatus.status === 'not_linked' || linkStatus.status === 'pending') && (
        <div className="flex flex-col gap-4">
          <div className="border-border rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5" />
              <span className="font-medium">Vincular seu Telegram</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Conecte sua conta do Telegram para gerenciar seu workspace pelo chat — crie agentes,
              automações, verifique integrações e muito mais.
            </p>
          </div>

          {code && (
            <div className="flex flex-col gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-muted-foreground mb-2 text-sm">Seu código de verificação</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-3xl font-bold tracking-widest">{code}</code>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                    {copied ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Instruções</p>
                <ol className="text-muted-foreground list-inside list-decimal text-sm">
                  {instructions.map((step) => (
                    <li key={step} className="py-0.5">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="text-primary size-4 animate-spin" />
                <span className="text-muted-foreground">Aguardando verificação...</span>
              </div>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end">
            {!code ? (
              <Button onClick={handleGenerateCode} disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Gerar Código
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCode(null)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- WhatsApp Section ---

function WhatsAppSection() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [qrData, setQrData] = useState<QrStatus | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: linkStatus = null } = useQuery<WhatsAppStatus>({
    queryKey: ['messaging-link', 'whatsapp'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/link?channel=whatsapp')
      return (await res.json()) as WhatsAppStatus
    },
  })

  // Poll QR code status while waiting for scan
  useQuery<QrStatus>({
    queryKey: ['whatsapp-qr-poll'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/whatsapp/qr')
      const data = (await res.json()) as QrStatus
      if (data.status === 'connected') {
        setIsPolling(false)
        setQrData(null)
        queryClient.invalidateQueries({ queryKey: ['messaging-link', 'whatsapp'] })
      } else {
        setQrData(data)
      }
      return data
    },
    enabled: isPolling,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  })

  async function handleConnect() {
    setIsConnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/whatsapp/qr', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'already_linked') {
          setError('WhatsApp já está vinculado. Desvincule primeiro.')
        } else {
          setError(data.error ?? 'Falha ao conectar')
        }
        return
      }
      setQrData(data as QrStatus)
      setIsPolling(true)
    } catch {
      setError('Falha ao conectar ao gateway WhatsApp')
    } finally {
      setIsConnecting(false)
    }
  }

  async function handleUnlink() {
    setIsUnlinking(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/whatsapp/qr', { method: 'DELETE' })
      if (!res.ok) {
        setError('Falha ao desvincular')
        return
      }
      setQrData(null)
      setIsPolling(false)
      queryClient.setQueryData(['messaging-link', 'whatsapp'], { status: 'not_linked' })
    } catch {
      setError('Falha ao desvincular')
    } finally {
      setIsUnlinking(false)
    }
  }

  function handleCancel() {
    setQrData(null)
    setIsPolling(false)
    // Disconnect the pending connection
    fetch('/api/messaging/whatsapp/qr', { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-4">
      {!linkStatus && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}

      {linkStatus?.status === 'linked' && (
        <div className="flex flex-col gap-4">
          <div className="border-border rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="size-5" />
                <span className="font-medium">WhatsApp Conectado</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Ativo
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Seu WhatsApp está vinculado ao seu workspace. Você pode gerenciar agentes, automações
              e skills diretamente pelo WhatsApp.
            </p>
            <div className="bg-muted mt-4 rounded-lg p-4 text-sm">
              {linkStatus.phoneNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Número</span>
                  <span className="font-medium">+{linkStatus.phoneNumber}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Vinculado</span>
                <span className="font-medium">
                  {new Date(linkStatus.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="text-destructive"
            >
              {isUnlinking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 size-4" />
              )}
              Desvincular WhatsApp
            </Button>
          </div>
        </div>
      )}

      {linkStatus && (linkStatus.status === 'not_linked' || linkStatus.status === 'pending') && (
        <div className="flex flex-col gap-4">
          <div className="border-border rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Phone className="size-5" />
              <span className="font-medium">Vincular seu WhatsApp</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Conecte seu WhatsApp para receber notificações, alertas e interagir com a IA direto
              pelo celular.
            </p>
          </div>

          {/* QR Code display */}
          {qrData && (qrData.status === 'qr_pending' || qrData.status === 'connecting') && (
            <div className="flex flex-col gap-4">
              <div className="bg-muted rounded-lg p-6 text-center">
                {qrData.qrCode ? (
                  <>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Escaneie o QR code com seu WhatsApp
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData.qrCode}
                      alt="QR Code WhatsApp"
                      className="mx-auto size-64 rounded-lg"
                    />
                  </>
                ) : (
                  <>
                    <Loader2 className="text-muted-foreground mx-auto size-8 animate-spin" />
                    <p className="text-muted-foreground mt-2 text-sm">Gerando QR code...</p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Instruções</p>
                <ol className="text-muted-foreground list-inside list-decimal text-sm">
                  <li className="py-0.5">Abra o WhatsApp no seu celular</li>
                  <li className="py-0.5">
                    Toque em Menu (⋮) ou Configurações {'>'} Aparelhos conectados
                  </li>
                  <li className="py-0.5">Toque em Conectar um aparelho</li>
                  <li className="py-0.5">Aponte o celular para o QR code acima</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="text-primary size-4 animate-spin" />
                <span className="text-muted-foreground">Aguardando leitura do QR code...</span>
              </div>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end">
            {!qrData ? (
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Conectar WhatsApp
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---

export default function MessagingSection() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Mensagens</h2>
        <p className="text-muted-foreground text-sm">
          Conecte seus canais de mensagens para gerenciar seu workspace de qualquer lugar
        </p>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">
            <Phone className="mr-2 size-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="telegram">
            <MessageCircle className="mr-2 size-4" />
            Telegram
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppSection />
        </TabsContent>
        <TabsContent value="telegram" className="mt-4">
          <TelegramSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
