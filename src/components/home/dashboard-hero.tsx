'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowUp, Loader2, Calendar, MessageSquare, PenTool } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getActiveSkillConfigs, type SkillConfig } from '@/lib/skills/skill-registry'
import { fetchSkillsAction } from '@/lib/actions/skills'

const ICON_MAP: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare size={14} />,
  Calendar: <Calendar size={14} />,
  PenTool: <PenTool size={14} />,
}

export default function DashboardHero() {
  const router = useRouter()
  const [selectedSkill, setSelectedSkill] = useState('general')
  const [value, setValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: activeSlugs = [] } = useQuery({
    queryKey: ['active-skill-slugs'],
    queryFn: async () => {
      const skills = await fetchSkillsAction()
      return skills.filter((s) => s.status === 'active').map((s) => s.slug)
    },
    staleTime: 60_000,
  })

  const skillConfigs = getActiveSkillConfigs(activeSlugs)
  const currentConfig = skillConfigs.find((s) => s.slug === selectedSkill) ?? skillConfigs[0]

  const send = useCallback(
    async (msg: string) => {
      const trimmed = msg.trim()
      if (!trimmed || isCreating) return
      setIsCreating(true)
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            selected_skill: selectedSkill === 'general' ? null : selectedSkill,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create task')
        }
        const { taskId } = await res.json()
        setValue('')
        router.push(`/chat/task/${taskId}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao criar tarefa.')
        setIsCreating(false)
      }
    },
    [isCreating, router, selectedSkill]
  )

  return (
    <div className="flex w-full flex-col items-center" style={{ maxWidth: 680, gap: 24 }}>
      {/* Title */}
      <h1
        className="text-foreground text-center font-medium"
        style={{ fontSize: 22, lineHeight: '30px' }}
      >
        O que sua loja precisa hoje?
      </h1>

      {/* Ask bar with integrated skill selector */}
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
          className="placeholder:text-muted-foreground max-h-32 w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm leading-relaxed outline-none disabled:opacity-50"
        />
        {/* Bottom bar: skill pills + send button */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Skill pills */}
          <div className="flex items-center gap-1">
            {skillConfigs.map((skill) => {
              const isActive = skill.slug === selectedSkill
              return (
                <button
                  key={skill.slug}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSkill(skill.slug)
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  {ICON_MAP[skill.icon] ?? <MessageSquare size={12} />}
                  {skill.name}
                </button>
              )
            })}
          </div>

          {/* Send button */}
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

      {/* Contextual suggestions */}
      <div className="flex flex-wrap justify-center gap-2">
        {currentConfig.suggestions.map((text) => (
          <button
            key={text}
            onClick={() => send(text)}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-full border px-4 py-2 text-[13px] transition-colors"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
