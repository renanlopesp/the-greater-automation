'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_HEIGHT = 160

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask Snew anything...',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_HEIGHT)}px`
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height after clearing
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.style.height = 'auto'
      }
    })
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="w-full" style={{ padding: '16px 24px' }}>
      <div className="relative mx-auto" style={{ maxWidth: 680 }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full resize-none text-sm',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none'
          )}
          style={{
            borderRadius: 28,
            padding: '14px 52px 14px 20px',
            minHeight: 52,
            maxHeight: MAX_HEIGHT,
            border: '1px solid var(--border)',
            background: 'var(--background)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = ''
          }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasText || disabled}
          aria-label="Send message"
          className={cn(
            'absolute flex items-center justify-center rounded-full transition-colors',
            hasText && !disabled
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground'
          )}
          style={{
            width: 34,
            height: 34,
            bottom: 10,
            right: 10,
          }}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
