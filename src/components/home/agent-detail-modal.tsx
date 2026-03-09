'use client'

import { Link2, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import ChatPanel from '@/components/agent-detail/chat-panel'
import WorkflowsList from '@/components/agent-detail/workflows-list'
import SkillsList from '@/components/agent-detail/skills-list'
import { getAgentModalData } from '@/lib/actions/agent-modal-data'
import { getAgentWorkflows } from '@/lib/actions/agent-workflows'
import { getAgentSkills } from '@/lib/actions/agent-skills'

interface AgentItem {
  id: string
  name: string
  description: string | null
  palette: string
  is_active: boolean
  category?: string | null
}

interface AgentDetailModalProps {
  agent: AgentItem | null
  teamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const APP_DISPLAY: Record<string, string> = {
  nuvemshop: 'Nuvemshop',
  shopify: 'Shopify',
  github: 'GitHub',
  slack: 'Slack',
  gmail: 'Gmail',
  notion: 'Notion',
  linear: 'Linear',
  mercadolivre: 'Mercado Livre',
  google_calendar: 'Google Calendar',
}

function formatAppName(appId: string): string {
  return (
    APP_DISPLAY[appId] ??
    appId
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

export default function AgentDetailModal({
  agent,
  teamId,
  open,
  onOpenChange,
}: AgentDetailModalProps) {
  const agentId = agent?.id ?? ''

  const { data: modalData, isLoading: modalLoading } = useQuery({
    queryKey: ['agent-modal-data', agentId],
    queryFn: () => getAgentModalData(agentId),
    enabled: open && !!agentId,
    gcTime: 0,
  })

  const { data: workflows = [] } = useQuery({
    queryKey: ['agent-workflows', agentId],
    queryFn: () => getAgentWorkflows(agentId),
    enabled: open && !!agentId,
  })

  const { data: skills = [] } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: () => getAgentSkills(agentId),
    enabled: open && !!agentId,
  })

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:mx-4 sm:max-w-6xl lg:mx-8"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-6 py-4">
          <span className="bg-muted flex size-10 items-center justify-center rounded-full text-lg">
            💬
          </span>
          <div className="flex-1">
            <DialogTitle className="text-base font-semibold">{agent.name}</DialogTitle>
            <p className="text-muted-foreground text-sm">{agent.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-md p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body: Chat + Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Real ChatPanel (AI SDK — streaming, tool calls, file attachments) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {modalLoading || !modalData ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-muted-foreground text-sm">Carregando...</div>
              </div>
            ) : (
              <ChatPanel
                key={modalData.conversationId ?? 'new'}
                agentId={agentId}
                agentName={agent.name}
                agentPalette={agent.palette}
                conversationStarters={modalData.conversationStarters}
                currentUserId={modalData.currentUserId}
                initialConversationId={modalData.conversationId}
                initialMessages={modalData.messages}
              />
            )}
          </div>

          {/* Right: Sidebar (prototype layout) */}
          <aside className="bg-muted/30 w-[280px] shrink-0 border-l">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Agent Info */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-muted flex size-10 items-center justify-center rounded-full text-lg">
                      💬
                    </span>
                    <div>
                      <h1 className="text-sm font-semibold">{agent.name}</h1>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {agent.description ?? 'No description available.'}
                  </p>
                </div>

                {/* Run Agent */}
                <Button className="mb-6 w-full gap-2" variant="default">
                  ▶ Run Agent
                </Button>

                {/* Channels — real connected apps in list format */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xs font-semibold tracking-wider uppercase">Channels</h2>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                    >
                      <Link2 className="size-3" />
                      Connect
                    </button>
                  </div>
                  <div className="space-y-2">
                    {modalData && modalData.connectedApps.length > 0 ? (
                      modalData.connectedApps.map((app) => (
                        <div key={app.app_id} className="flex items-center justify-between text-sm">
                          <span>{app.account_label ?? formatAppName(app.app_id)}</span>
                          <span className="bg-foreground text-background rounded-md px-2 py-0.5 text-xs">
                            Active
                          </span>
                        </div>
                      ))
                    ) : modalData ? (
                      <p className="text-muted-foreground text-xs">Nenhum canal conectado</p>
                    ) : (
                      <div className="bg-muted h-6 animate-pulse rounded" />
                    )}
                  </div>
                </div>

                {/* Automações / Skills Tabs */}
                <Tabs defaultValue="workflows" className="space-y-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="workflows" className="h-7 px-3 text-xs">
                      Automações
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="h-7 px-3 text-xs">
                      Skills
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="workflows" className="mt-0">
                    <WorkflowsList
                      workflows={workflows}
                      agentId={agentId}
                      teamId={teamId}
                      triggerSubscriptions={modalData?.triggerSubscriptions}
                    />
                  </TabsContent>
                  <TabsContent value="skills" className="mt-0">
                    <SkillsList skills={skills} agentId={agentId} />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
