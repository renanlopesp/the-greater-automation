'use client'

import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface AskBarHandle {
  fill: (text: string) => void
}

interface AskBarNewProps {
  selectedSkill?: string
}

export default forwardRef<AskBarHandle, AskBarNewProps>(function AskBarNew({ selectedSkill }, ref) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    fill(text: string) {
      setValue(text)
      textareaRef.current?.focus()
    },
  }))

  const send = useCallback(
    async (msg: string) => {
      const trimmed = msg.trim()
      if (!trimmed || isCreating) return

      setIsCreating(true)
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, selected_skill: selectedSkill ?? null }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create task')
        }

        const { taskId } = await res.json()
        setValue('')
        router.push(`/studio/create/${taskId}`)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao criar tarefa. Tente novamente.'
        )
        setIsCreating(false)
      }
    },
    [isCreating, router]
  )

  return (
    <div
      className={cn(
        'bg-background border-border w-full border transition-all',
        'focus-within:border-foreground/25'
      )}
      style={{
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
      }}
      onClick={() => textareaRef.current?.focus()}
    >
      <textarea
        ref={textareaRef}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isCreating}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(value)
          }
        }}
        placeholder="Pergunte sobre campanhas, copies, assets, dados..."
        className="placeholder:text-muted-foreground max-h-32 w-full resize-none bg-transparent px-5 pt-4 pb-3 text-sm leading-relaxed outline-none disabled:opacity-50"
      />
      <div className="flex items-center justify-end px-4 pb-4">
        <button
          onClick={() => send(value)}
          disabled={isCreating}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
            isCreating
              ? 'bg-muted text-muted-foreground'
              : value.trim()
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground'
          )}
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
})
