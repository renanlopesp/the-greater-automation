'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Loader2, MessageCircle, Unlink } from 'lucide-react'

type LinkStatus =
  | { status: 'not_linked' }
  | { status: 'pending'; linkId: string }
  | {
      status: 'linked'
      linkId: string
      telegramUsername: string | null
      conversationId: string | null
      createdAt: string
    }

export default function MessagingSection() {
  const [code, setCode] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: linkStatus = null } = useQuery<LinkStatus>({
    queryKey: ['messaging-link'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/link')
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
      const res = await fetch('/api/messaging/link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Falha ao gerar código')
        return
      }
      setCode(data.code)
      setInstructions(data.instructions)
      queryClient.invalidateQueries({ queryKey: ['messaging-link'] })
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
      const res = await fetch('/api/messaging/link', { method: 'DELETE' })
      if (!res.ok) {
        setError('Falha ao desvincular')
        return
      }
      queryClient.setQueryData(['messaging-link'], { status: 'not_linked' })
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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Mensagens</h2>
        <p className="text-muted-foreground text-sm">
          Conecte seu Telegram para gerenciar todo o seu workspace de qualquer lugar
        </p>
      </div>

      {!linkStatus && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}

      {/* Linked state */}
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
              {linkStatus.telegramUsername && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telegram</span>
                  <span className="font-medium">@{linkStatus.telegramUsername}</span>
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

      {/* Not linked / Pending states */}
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

          {/* Verification code */}
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
