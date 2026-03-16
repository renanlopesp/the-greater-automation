import InstalledClient from '@/components/agent-workspace/installed-client'

export default async function InstalledAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <InstalledClient agentId={id} />
}
