'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  createKnowledgeSkill,
  deleteKnowledgeSkill,
  toggleKnowledgeSkill,
} from '@/lib/actions/agent-knowledge-skills'

export interface KnowledgeSkill {
  id: string
  name: string
  description: string | null
  content: string
  source: string
  is_enabled: boolean | null
}

interface KnowledgeSkillsListProps {
  skills: KnowledgeSkill[]
  agentId: string
}

export default function KnowledgeSkillsList({ skills, agentId }: KnowledgeSkillsListProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')

  function handleCreate() {
    if (!formName.trim() || !formContent.trim()) return
    startTransition(async () => {
      const result = await createKnowledgeSkill(
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
      await deleteKnowledgeSkill(skillId, agentId)
    })
  }

  function handleToggle(skillId: string, current: boolean) {
    startTransition(async () => {
      await toggleKnowledgeSkill(skillId, agentId, !current)
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-background overflow-hidden rounded-2xl border shadow-sm">
        <div className="divide-y">
          {skills.map((skill) => (
            <div key={skill.id} className="group px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="bg-background text-muted-foreground flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border shadow-sm">
                  <Brain className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{skill.name}</p>
                  {skill.description && (
                    <p className="text-muted-foreground truncate text-xs">{skill.description}</p>
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
              {expandedId === skill.id && (
                <div className="bg-muted/30 mt-2 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                    {skill.content}
                  </p>
                </div>
              )}
            </div>
          ))}

          {skills.length === 0 && !showForm && (
            <div className="px-4 py-8 text-center">
              <p className="text-muted-foreground text-sm">No skills yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Add skills to teach your agent specialized knowledge
              </p>
            </div>
          )}
        </div>

        {showForm ? (
          <div className="space-y-3 border-t p-4">
            <Input
              placeholder="Skill name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <Textarea
              placeholder="Skill content — instructions or knowledge for the agent..."
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
                {isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
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
            Add skill
          </button>
        )}
      </div>
    </div>
  )
}
