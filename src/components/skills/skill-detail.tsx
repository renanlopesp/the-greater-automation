'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { activateSkill, deactivateSkill } from '@/lib/actions/skills'
import { skillCategoryLabels, type SkillCategory } from '@/data/skills'
import { type SkillRow, type SkillExecutionRow } from '@/lib/queries/skills'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SkillDetailProps {
  teamId: string
  skill: SkillRow
  executions: SkillExecutionRow[]
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-muted text-muted-foreground',
}

export default function SkillDetail({ teamId, skill, executions }: SkillDetailProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const isActive = skill.status === 'active'

  function handleToggle() {
    startTransition(async () => {
      if (isActive) {
        await deactivateSkill(teamId, skill.slug)
      } else {
        await activateSkill(teamId, skill.slug)
      }
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back link */}
      <Link
        href="/skills"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Skills
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{skill.name}</h1>
            {isActive ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="text-muted-foreground h-5 w-5" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {skillCategoryLabels[skill.category as SkillCategory] ?? skill.category}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                isActive
                  ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400'
                  : 'text-muted-foreground'
              )}
            >
              {isActive ? 'Ativo' : 'Disponível'}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {skill.description}
          </p>
        </div>
        <Button
          variant={isActive ? 'outline' : 'default'}
          disabled={pending}
          onClick={handleToggle}
          className="shrink-0"
        >
          {isActive ? 'Desativar' : 'Ativar'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Dependencies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dependências</CardTitle>
            </CardHeader>
            <CardContent>
              {skill.dependencies.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma dependência.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skill.dependencies.map((dep) => (
                    <Link key={dep} href={`/skills/${dep}`}>
                      <Badge variant="secondary" className="hover:bg-muted cursor-pointer">
                        {dep}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required connections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Conexões necessárias</CardTitle>
            </CardHeader>
            <CardContent>
              {skill.requires_connections.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma conexão necessária.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skill.requires_connections.map((conn) => (
                    <Badge key={conn} variant="outline" className="capitalize">
                      {conn}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Últimas execuções</CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma execução registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="text-sm">{formatDate(exec.created_at)}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              STATUS_BADGE[exec.status] ?? STATUS_BADGE.pending
                            )}
                          >
                            {exec.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDuration(exec.duration_ms)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
