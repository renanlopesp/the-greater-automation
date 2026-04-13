'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowUp } from 'lucide-react'

interface HeroPromptProps {
  storeName?: string
}

/**
 * Home hero — h1 title + chatbox with textarea + submit button.
 * 1:1 port from snew-ai-core SnewStudioHomePage.tsx lines 521-593.
 */
export function HeroPrompt({ storeName }: HeroPromptProps) {
  const router = useRouter()
  const [value, setValue] = useState('')

  const title = storeName ? `O que criar para ${storeName} hoje?` : 'O que você quer criar hoje?'
  const placeholder = storeName
    ? `Descreva o criativo para ${storeName}...`
    : 'Descreva a imagem, vídeo ou carrossel...'

  const submit = () => {
    const text = value.trim()
    if (!text) return
    router.push(`/studio/create?autoPrompt=${encodeURIComponent(text)}`)
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h1
        style={{
          color: '#1A1A1A',
          margin: '0 0 24px',
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: '-0.02em',
        }}
        className="dark:text-foreground"
      >
        {title}
      </h1>

      <div
        style={{
          maxWidth: 580,
          margin: '0 auto 14px',
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          position: 'relative',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          border: '1px solid #E8E8E4',
          minHeight: 80,
        }}
        className="dark:bg-card dark:border-border"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault()
              submit()
            }
          }}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            color: '#1A1A1A',
            background: 'transparent',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            padding: 0,
            paddingBottom: 32,
            boxSizing: 'border-box',
            verticalAlign: 'top',
            display: 'block',
          }}
          className="dark:text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={submit}
          aria-label="Enviar"
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: value.trim() ? '#1A1A1A' : '#E0E0DC',
            color: '#FFFFFF',
            cursor: value.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  )
}
