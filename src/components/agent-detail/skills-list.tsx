'use client'

import { useState, useMemo, useTransition } from 'react'
import { Plus, X, Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { createSkill, deleteSkill, toggleSkill } from '@/lib/actions/agent-skills'

export interface Skill {
  id: string
  name: string
  description: string | null
  content: string
  source: string
  is_enabled: boolean | null
  type: string
  parameters: unknown | null
  version: number
}

interface SkillSection {
  heading: string
  content: string
}

/**
 * Parse skill content into sections based on ## headers
 * Returns array of {heading, content} objects
 * Handles unstructured content as single "Content" block
 */
export function parseSkillSections(content: string): SkillSection[] {
  if (!content || content.trim() === '') {
    return []
  }

  const trimmed = content.trim()
  const sections: SkillSection[] = []

  // Split on ## headers
  const parts = trimmed.split(/^##\s+/m)

  // If no ## headers found, return entire content as single block
  if (parts.length === 1) {
    return [{ heading: 'Content', content: trimmed }]
  }

  // First part before any ## is ignored if empty
  const firstPart = parts[0].trim()
  if (firstPart) {
    sections.push({ heading: 'Content', content: firstPart })
  }

  // Process remaining parts (each starts with a heading)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const firstLineEnd = part.indexOf('\n')

    if (firstLineEnd === -1) {
      // No newline, entire part is heading
      sections.push({ heading: part.trim(), content: '' })
    } else {
      const heading = part.substring(0, firstLineEnd).trim()
      const content = part.substring(firstLineEnd + 1).trim()
      sections.push({ heading, content })
    }
  }

  return sections
}

/**
 * Count steps in content by looking for numbered items in ## Steps section
 */
function countSteps(content: string): number {
  const sections = parseSkillSections(content)
  const stepsSection = sections.find((s) => s.heading.toLowerCase() === 'steps')

  if (!stepsSection || !stepsSection.content) return 0

  // Count lines that start with numbers (e.g., "1.", "2.", etc.)
  const lines = stepsSection.content.split('\n')
  return lines.filter((line) => /^\s*\d+\.\s+/.test(line)).length
}

/**
 * Count parameters from parameters JSON
 */
function countParameters(parameters: unknown | null): number {
  if (!parameters) return 0
  if (Array.isArray(parameters)) return parameters.length
  if (typeof parameters === 'object') return Object.keys(parameters).length
  return 0
}

interface SkillsListProps {
  skills: Skill[]
  agentId: string
}

interface SkillContentProps {
  content: string
}

function SkillContent({ content }: SkillContentProps) {
  const sections = parseSkillSections(content)

  if (sections.length === 0) {
    return (
      <div className="bg-muted/30 mt-2 rounded-lg p-3">
        <p className="text-muted-foreground text-xs">Sem conteúdo</p>
      </div>
    )
  }

  // If only one section, don't use collapsible
  if (sections.length === 1) {
    return (
      <div className="bg-muted/30 mt-2 rounded-lg p-3">
        <p className="text-muted-foreground text-xs whitespace-pre-wrap">{sections[0].content}</p>
      </div>
    )
  }

  // Multiple sections - use collapsible
  return (
    <div className="mt-2 space-y-2">
      {sections.map((section, index) => (
        <Collapsible key={index} defaultOpen={index === 0}>
          <div className="bg-muted/30 rounded-lg">
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between px-3 py-2 text-left transition-colors">
              <span className="text-sm font-medium">{section.heading}</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3">
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}

export default function SkillsList({ skills, agentId }: SkillsListProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')

  function handleCreate() {
    if (!formName.trim() || !formContent.trim()) return
    startTransition(async () => {
      const result = await createSkill(
        agentId,
        formName.trim(),
        formContent.trim(),
        formDescription.trim() || undefined
      )
      if (!result.error) {
        setFormName('')
        setFormDescription('')
        setFormContent('')
        setShowForm(false)
      }
    })
  }

  function handleDelete(skillId: string) {
    startTransition(async () => {
      await deleteSkill(skillId, agentId)
    })
  }

  function handleToggle(skillId: string, current: boolean) {
    startTransition(async () => {
      await toggleSkill(skillId, agentId, !current)
    })
  }

  const skillMeta = useMemo(
    () =>
      skills.map((skill) => ({
        ...skill,
        stepCount: countSteps(skill.content),
        paramCount: countParameters(skill.parameters),
      })),
    [skills]
  )

  return (
    <div className="space-y-3">
      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {skillMeta.map((skill) => (
            <div key={skill.id} className="group px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="bg-background text-muted-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm">
                  <Brain className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{skill.name}</p>
                    <Badge variant={skill.type === 'knowledge' ? 'secondary' : 'default'}>
                      {skill.type === 'knowledge' ? 'Conhecimento' : 'Procedimento'}
                    </Badge>
                  </div>
                  {skill.description && (
                    <p className="text-muted-foreground truncate text-xs">{skill.description}</p>
                  )}
                  {skill.type === 'procedure' && expandedId !== skill.id && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {skill.paramCount} parâmetros · {skill.stepCount} etapas
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
                  >
                    {expandedId === skill.id ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Switch
                    checked={skill.is_enabled ?? true}
                    onCheckedChange={() => handleToggle(skill.id, skill.is_enabled ?? true)}
                    aria-label="Toggle skill"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(skill.id)}
                    className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {expandedId === skill.id && <SkillContent content={skill.content} />}
            </div>
          ))}

          {skills.length === 0 && !showForm && (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum skill ainda</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Adicione skills para ensinar conhecimentos especializados ao agente
              </p>
            </div>
          )}
        </div>

        {showForm ? (
          <div className="space-y-3 border-t p-4">
            <Input
              placeholder="Nome do skill"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Descrição (opcional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <Textarea
              placeholder="Conteúdo do skill — instruções ou conhecimento para o agente..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isPending || !formName.trim() || !formContent.trim()}
              >
                {isPending ? 'Criando...' : 'Criar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 flex w-full items-center justify-center gap-2 border-t px-4 py-3 text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar skill
          </button>
        )}
      </div>
    </div>
  )
}
