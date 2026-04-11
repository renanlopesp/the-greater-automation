'use client'

import Link from 'next/link'
import { SlidersHorizontal, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SkillsList from '@/components/agent-detail/skills-list'
import ConnectionIndicators from '@/components/agent-detail/connection-indicators'
import RunHistory, { type Run } from '@/components/agent-detail/run-history'

interface AgentSidebarProps {
  agentId: string
  skills: Array<{
    id: string
    name: string
    description: string | null
    content: string
    source: string
    is_enabled: boolean | null
    type: string
    parameters: unknown | null
    version: number
  }>
  connectedApps: Array<{
    app_id: string
    account_label: string | null
  }>
  allRuns: Run[]
}

export default function AgentSidebar({
  agentId,
  skills,
  connectedApps,
  allRuns,
}: AgentSidebarProps) {
  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>Configurações</TooltipContent>
      </Tooltip>
      <SheetContent
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[50vw]"
      >
        <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Detalhes do Agente</SheetTitle>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link href={`/agents/${agentId}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar agente
                </Link>
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Skills, connected apps, and activity
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
          <div className="space-y-6 p-6">
            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Skills</h2>
              <SkillsList skills={skills} agentId={agentId} />
            </section>

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Aplicativos conectados</h2>
              <ConnectionIndicators apps={connectedApps} />
            </section>

            <section className="space-y-3">
              <h2 className="text-foreground text-[15px] font-semibold">Histórico de execuções</h2>
              <RunHistory runs={allRuns} />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
