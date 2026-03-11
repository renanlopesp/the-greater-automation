'use client'

import { Bot } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

export default function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const { t } = useLanguage()

  const prompts = [t('chat.prompt1'), t('chat.prompt2'), t('chat.prompt3'), t('chat.prompt4')]

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="bg-foreground text-background flex h-12 w-12 items-center justify-center rounded-full">
        <Bot className="h-6 w-6" />
      </div>
      <h2 className="text-foreground mt-4 text-xl font-semibold">{t('chat.emptyState.title')}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-center text-sm leading-relaxed">
        {t('chat.emptyState.subtitle')}
      </p>
      <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="border-border hover:bg-muted/50 rounded-xl border p-4 text-left transition-colors"
          >
            <p className="text-foreground text-sm leading-snug">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
