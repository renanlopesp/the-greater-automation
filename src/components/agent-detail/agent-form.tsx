'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from 'boring-avatars'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PALETTE_MAP, type PaletteName } from '@/lib/agent-palettes'
import { createAgent, updateAgent } from '@/lib/actions/agents'
import PalettePicker from './palette-picker'
import StarterEditor from './starter-editor'

interface AgentData {
  id: string
  name: string
  description: string | null
  palette: string
  system_prompt: string | null
  model: string | null
  temperature: number | null
  max_tokens: number | null
  conversation_starters: unknown
  skillWorkflowIds?: string[]
}

interface Workflow {
  id: string
  name: string
  emoji: string | null
  status: string
}

interface AgentFormProps {
  mode: 'create' | 'edit'
  agent?: AgentData
  workflows: Workflow[]
  teamId: string
  userId: string
}

export default function AgentForm({ mode, agent, workflows, teamId, userId }: AgentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState(agent?.name ?? '')
  const [description, setDescription] = useState(agent?.description ?? '')
  const [palette, setPalette] = useState<PaletteName>((agent?.palette as PaletteName) ?? 'blue')
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? '')
  const [model, setModel] = useState(agent?.model ?? '')
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(agent?.max_tokens ?? 4096)
  const [starters, setStarters] = useState<string[]>(() => {
    const raw = agent?.conversation_starters
    if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === 'string')
    return []
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createAgent({
          teamId,
          userId,
          name,
          description: description || undefined,
          palette,
          systemPrompt: systemPrompt || undefined,
          model: model || undefined,
          temperature,
          maxTokens,
          conversationStarters: starters.filter(Boolean),
        })

        if (result.error) {
          setError(result.error)
          return
        }

        router.push(`/agents/${result.id}`)
      } else if (agent) {
        const result = await updateAgent(agent.id, {
          name,
          description,
          palette,
          systemPrompt,
          model,
          temperature,
          maxTokens,
          conversationStarters: starters.filter(Boolean),
        })

        if (result.error) {
          setError(result.error)
          return
        }

        router.push(`/agents/${agent.id}`)
      }
    })
  }

  const paletteColors = PALETTE_MAP[palette] ?? PALETTE_MAP.blue

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">
          {mode === 'create' ? 'Create agent' : 'Edit agent'}
        </h1>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left column: Form fields */}
        <div className="flex-1 space-y-8">
          {/* Identity */}
          <section className="space-y-4">
            <h2 className="text-foreground text-base font-semibold">Identity</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Agent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this agent do?"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Palette */}
          <section className="space-y-4">
            <h2 className="text-foreground text-base font-semibold">Avatar palette</h2>
            <PalettePicker value={palette} onChange={setPalette} agentName={name} />
          </section>

          <Separator />

          {/* Instructions */}
          <section className="space-y-4">
            <h2 className="text-foreground text-base font-semibold">Instructions</h2>
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </section>

          <Separator />

          {/* Model & Parameters */}
          <section className="space-y-4">
            <h2 className="text-foreground text-base font-semibold">Model</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperature ({temperature.toFixed(1)})</Label>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  min={1}
                  max={128000}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Conversation Starters */}
          <section className="space-y-4">
            <h2 className="text-foreground text-base font-semibold">Conversation starters</h2>
            <p className="text-muted-foreground text-sm">
              Suggested prompts shown when starting a new conversation.
            </p>
            <StarterEditor starters={starters} onChange={setStarters} />
          </section>
        </div>

        {/* Right column: Preview card */}
        <div className="lg:w-[300px]">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-foreground mb-4 text-base font-semibold">Preview</h2>
            <div
              className="flex flex-col items-center gap-4 rounded-2xl border p-6"
              style={{ backgroundColor: paletteColors[3] }}
            >
              <div className="overflow-hidden rounded-full border-4 border-white">
                <Avatar size={80} name={name || 'Agent'} variant="bauhaus" colors={paletteColors} />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold" style={{ color: paletteColors[4] }}>
                  {name || 'Untitled Agent'}
                </p>
                {description && (
                  <p
                    className="line-clamp-2 text-xs"
                    style={{ color: paletteColors[0], opacity: 0.8 }}
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
