'use client'

import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AskBarHandle {
  fill: (text: string) => void
}

export default forwardRef<AskBarHandle>(function AskBarNew(_props, ref) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    fill(text: string) {
      setValue(text)
      textareaRef.current?.focus()
    },
  }))

  const send = (msg: string) => {
    const trimmed = msg.trim()
    if (!trimmed) return
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div
      className={cn(
        'bg-background w-full border border-transparent transition-all',
        'focus-within:border-foreground/15'
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(value)
          }
        }}
        placeholder="Pergunte sobre campanhas, copies, assets, dados..."
        className="placeholder:text-muted-foreground max-h-32 w-full resize-none bg-transparent px-5 pt-4 pb-3 text-sm leading-relaxed outline-none"
      />
      <div className="flex items-center justify-end px-4 pb-4">
        <button
          onClick={() => send(value)}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
            value.trim() ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
})
