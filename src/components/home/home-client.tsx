'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import GreetingSection from '@/components/home/greeting-section'
import ChatInputSection from '@/components/home/chat-input-section'
import InsightsSection from '@/components/home/insights-section'
import AgentGridSection from '@/components/home/agent-grid-section'

interface AgentItem {
  id: string
  name: string
  description: string | null
  palette: string
  is_active: boolean
  category?: string | null
}

interface HomeClientProps {
  userName: string | null
  storeName: string | null
  orchestratorId: string | null
  agents: AgentItem[]
  teamId: string
  connectedApp?: string
  connectionError?: string
}

export default function HomeClient({
  userName,
  storeName,
  orchestratorId,
  agents,
  teamId,
  connectedApp,
  connectionError,
}: HomeClientProps) {
  const toastShown = useRef(false)

  useEffect(() => {
    if (toastShown.current) return
    if (connectedApp) {
      toastShown.current = true
      toast.success(
        `${connectedApp.charAt(0).toUpperCase() + connectedApp.slice(1)} connected successfully`
      )
    } else if (connectionError) {
      toastShown.current = true
      toast.error(`Connection failed: ${connectionError.replace(/_/g, ' ')}`)
    }
  }, [connectedApp, connectionError])

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 pt-16 pb-8">
      <GreetingSection userName={userName} storeName={storeName} />
      <ChatInputSection orchestratorId={orchestratorId} />
      <Separator />
      <InsightsSection />
      <AgentGridSection agents={agents} teamId={teamId} />
    </div>
  )
}
