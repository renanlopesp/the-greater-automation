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
      <div className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-full">
        <Bot className="h-5 w-5" />
      </div>
      <h2 className="text-foreground mt-4 text-2xl font-semibold">{t('chat.emptyState.title')}</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm leading-relaxed">
        {t('chat.emptyState.subtitle')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="border-border hover:bg-muted/50 rounded-full border px-4 py-2 text-sm transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
