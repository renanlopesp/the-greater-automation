'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TelegramStepProps {
  onSkip: () => void
  onLinked: () => void
}

export function TelegramStep({ onSkip, onLinked }: TelegramStepProps) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)

  const generateCode = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/messaging/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'already_linked') {
          setLinked(true)
          onLinked()
          return
        }
        throw new Error(data.error || 'Failed to generate code')
      }
      const data = await res.json()
      setCode(data.code)
      // Start polling for verification
      pollLinkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar código')
    } finally {
      setLoading(false)
    }
  }

  const pollLinkStatus = () => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      if (attempts > 60) {
        // 5 minutes max
        clearInterval(interval)
        return
      }
      try {
        const res = await fetch('/api/messaging/link')
        if (res.ok) {
          const data = await res.json()
          if (data.linked) {
            clearInterval(interval)
            setLinked(true)
            onLinked()
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 5000)
  }

  if (linked) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-2xl font-bold tracking-tight">Telegram conectado!</h2>
        <p className="text-muted-foreground">
          Você vai receber alertas e pode conversar com a Snew direto no Telegram.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Conectar Telegram</h2>
        <p className="text-muted-foreground">
          Receba alertas de estoque, vendas e pedidos direto no Telegram.
        </p>
      </div>

      {!code ? (
        <div className="space-y-3">
          <Button onClick={generateCode} disabled={loading} className="w-full">
            {loading ? 'Gerando código...' : 'Gerar código de verificação'}
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Pular por agora
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted rounded-lg border p-4 text-center">
            <p className="text-muted-foreground mb-2 text-sm">Seu código de verificação:</p>
            <Input
              value={code}
              readOnly
              className="text-center font-mono text-2xl tracking-widest"
            />
          </div>
          <div className="text-muted-foreground space-y-2 text-sm">
            <p>
              1. Abra o Telegram e procure <strong>@SnewRelayBot</strong>
            </p>
            <p>
              2. Envie: <code>/link {code}</code>
            </p>
            <p>3. Aguarde a confirmação aqui</p>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <div className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            Aguardando verificação...
          </div>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Pular por agora
          </Button>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
