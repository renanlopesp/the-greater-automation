'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BrandDnaScreen } from '@/components/onboarding/brand-dna-screen'

export default function BrandDnaPage() {
  const queryClient = useQueryClient()
  const [regenerating, setRegenerating] = useState(false)
  const [progress, setProgress] = useState('')

  async function handleRegenerate() {
    if (regenerating) return
    setRegenerating(true)
    setProgress('Iniciando...')

    try {
      const res = await fetch('/api/onboarding/analyze', { method: 'POST' })
      if (!res.ok || !res.body) {
        throw new Error('Falha ao iniciar análise')
      }

      // Read SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: step')) continue
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.message) setProgress(data.message)
              if (data.redirect) {
                // Done
                queryClient.invalidateQueries({ queryKey: ['brand-dna'] })
                toast.success('Brand DNA regenerado!')
                setProgress('')
                return
              }
              if (data.message?.toLowerCase().includes('erro')) {
                throw new Error(data.message)
              }
            } catch {
              // ignore parse errors
            }
          }
          if (line.startsWith('event: done')) {
            queryClient.invalidateQueries({ queryKey: ['brand-dna'] })
            toast.success('Brand DNA regenerado!')
            setProgress('')
            return
          }
          if (line.startsWith('event: error')) {
            throw new Error('Erro na análise')
          }
        }
      }

      // Stream ended without explicit done event
      queryClient.invalidateQueries({ queryKey: ['brand-dna'] })
      toast.success('Brand DNA regenerado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao regenerar Brand DNA')
    } finally {
      setRegenerating(false)
      setProgress('')
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-6 z-10 flex items-center gap-3">
        {progress && <span className="text-muted-foreground text-xs">{progress}</span>}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-foreground text-background flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerando...' : 'Regenerar Brand DNA'}
        </button>
      </div>
      <BrandDnaScreen />
    </div>
  )
}
