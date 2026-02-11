'use client'

import { useState, useRef } from 'react'
import { Diamond, PanelLeftClose, SendHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import { cn } from '@/lib/utils'
import UseCaseCard from '@/components/workflow-editor/use-case-card'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestedWorkflow?: {
    trigger: { type: string; config: Record<string, unknown> }
    steps: { type: string; name: string; config: Record<string, unknown> }[]
  }
}

const USE_CASES = [
  {
    emoji: '📋',
    title: 'Meeting briefings',
    description: 'Prepare for meetings with AI-generated context and summaries',
  },
  {
    emoji: '🔍',
    title: 'Competitor analysis',
    description: 'Track competitor activity and get AI-powered insights',
  },
  {
    emoji: '📧',
    title: 'Email assistant',
    description: 'Automatically draft, summarize, and categorize emails',
  },
  {
    emoji: '🎥',
    title: 'YouTube summarizer',
    description: 'Get AI summaries of YouTube videos and channels',
  },
]

export default function AIAssistantPanel() {
  const toggleAssistant = useWorkflowEditorStore((s) => s.toggleAssistant)
  const workflowId = useWorkflowEditorStore((s) => s.workflowId)
  const workflowName = useWorkflowEditorStore((s) => s.workflowName)
  const trigger = useWorkflowEditorStore((s) => s.trigger)
  const steps = useWorkflowEditorStore((s) => s.steps)
  const setTrigger = useWorkflowEditorStore((s) => s.setTrigger)
  const addStep = useWorkflowEditorStore((s) => s.addStep)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const handleSend = async (promptText?: string) => {
    const prompt = promptText || input.trim()
    if (!prompt || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    scrollToBottom()

    try {
      const response = await fetch(`/api/workflows/${workflowId}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentWorkflow: {
            trigger,
            steps,
            name: workflowName,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get assistant response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        suggestedWorkflow: data.suggestedWorkflow,
      }

      setMessages((prev) => [...prev, assistantMessage])
      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
      scrollToBottom()
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplySuggestion = (suggestedWorkflow: Message['suggestedWorkflow']) => {
    if (!suggestedWorkflow) return

    // Apply trigger
    if (suggestedWorkflow.trigger) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTrigger(suggestedWorkflow.trigger as any)
    }

    // Apply steps
    suggestedWorkflow.steps.forEach((step) => {
      addStep({
        id: `step-${Date.now()}-${Math.random()}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: step.type as any,
        name: step.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: step.config as any,
      })
    })

    // Add confirmation message
    const confirmMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: 'Applied the suggested workflow to your editor! You can now customize it further.',
    }
    setMessages((prev) => [...prev, confirmMessage])
    scrollToBottom()
  }

  const handleUseCaseClick = (title: string) => {
    const prompts: Record<string, string> = {
      'Meeting briefings': 'Build a workflow for daily meeting briefings',
      'Competitor analysis': 'Create a workflow to monitor competitor websites',
      'Email assistant': 'Set up an email automation workflow',
      'YouTube summarizer': 'Build a workflow to summarize YouTube videos',
    }
    handleSend(prompts[title] || title)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Diamond className="text-primary h-5 w-5" />
        <span className="flex-1 text-sm font-medium">Snew.app Assistant</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAssistant}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center p-4">
            <Diamond className="text-primary mt-8 h-12 w-12" />
            <h2 className="mt-4 text-center text-lg font-semibold">What can I help you build?</h2>

            <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {USE_CASES.map((uc) => (
                <div key={uc.title} onClick={() => handleUseCaseClick(uc.title)}>
                  <UseCaseCard {...uc} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col gap-2',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === 'assistant' && msg.suggestedWorkflow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySuggestion(msg.suggestedWorkflow)}
                    className="mt-1"
                  >
                    Apply to editor
                  </Button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-muted flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="relative border-t p-4">
        <Textarea
          placeholder="Describe a workflow or ask a question"
          rows={3}
          className="resize-none pr-10"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-6 bottom-6 h-8 w-8"
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
