import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bot, ExternalLink, MapPin, Calendar, Activity, Cpu } from 'lucide-react'
import SnewclawActions from './_components/snewclaw-actions'

type SnewclawInstance = {
  id: string
  fly_machine_id: string | null
  fly_volume_id: string | null
  status: string
  region: string
  config: Record<string, unknown>
  error_message: string | null
  last_activity_at: string | null
  created_at: string
  updated_at: string
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    running: { label: 'Running', variant: 'default' },
    provisioning: { label: 'Provisioning', variant: 'secondary' },
    starting: { label: 'Starting', variant: 'secondary' },
    stopping: { label: 'Stopping', variant: 'secondary' },
    stopped: { label: 'Stopped', variant: 'outline' },
    error: { label: 'Error', variant: 'destructive' },
    destroying: { label: 'Destroying', variant: 'destructive' },
    not_provisioned: { label: 'Not Provisioned', variant: 'outline' },
  }

  const v = variants[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={v.variant}>{v.label}</Badge>
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function SnewclawPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: instance } = await supabase
    .from('snewclaw_instances')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!instance) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 pt-24">
        <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
          <Bot className="text-muted-foreground size-8" />
        </div>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Parent Agent</CardTitle>
            <CardDescription className="text-base">
              Deploy your own AI agent instance — a persistent, containerized agent that runs on
              your behalf, handles long-running tasks, and connects to your tools and services.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/snewclaw/setup">Set up your agent</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const inst = instance as SnewclawInstance

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 pt-12 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Parent Agent</h1>
        <p className="text-muted-foreground text-sm">Your personal containerized AI agent</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Instance Status</CardTitle>
            <StatusBadge status={inst.status} />
          </div>
          {inst.error_message && <p className="text-destructive text-sm">{inst.error_message}</p>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Region</p>
                <p className="font-medium">{inst.region.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Created</p>
                <p className="font-medium">{formatDate(inst.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="text-muted-foreground size-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Last activity</p>
                <p className="font-medium">{formatDate(inst.last_activity_at)}</p>
              </div>
            </div>
            {inst.fly_machine_id && (
              <div className="flex items-center gap-2">
                <Cpu className="text-muted-foreground size-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Machine ID</p>
                  <p className="font-mono font-medium">{inst.fly_machine_id.slice(0, 12)}…</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            {inst.status === 'running' && (
              <Button asChild>
                <Link href="/snewclaw/chat">
                  <ExternalLink className="mr-2 size-4" />
                  Open Chat
                </Link>
              </Button>
            )}
            <SnewclawActions instanceId={inst.id} status={inst.status} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
