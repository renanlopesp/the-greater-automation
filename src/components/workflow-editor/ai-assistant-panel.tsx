'use client'

import { Diamond, PanelLeftClose, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkflowEditorStore } from '@/stores/workflow-editor-store'
import UseCaseCard from '@/components/workflow-editor/use-case-card'

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Diamond className="text-primary h-5 w-5" />
        <span className="flex-1 text-sm font-medium">Relay.app Assistant</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleAssistant}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center p-4">
          <Diamond className="text-primary mt-8 h-12 w-12" />
          <h2 className="mt-4 text-center text-lg font-semibold">What can I help you build?</h2>

          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            {USE_CASES.map((uc) => (
              <UseCaseCard key={uc.title} {...uc} />
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="relative border-t p-4">
        <Textarea
          placeholder="Describe a workflow or ask a question"
          rows={3}
          className="resize-none pr-10"
        />
        <Button variant="ghost" size="icon" className="absolute right-6 bottom-6 h-8 w-8">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
