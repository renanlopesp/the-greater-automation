'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FileText, Bot, Play, LayoutDashboard, FolderKanban, Plug } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { createBrowserClient } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/use-debounce'

interface CommandMenuProps {
  teamId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WorkflowResult {
  id: string
  name: string
  emoji: string | null
}

interface AgentResult {
  id: string
  name: string
}

interface RunResult {
  id: string
  status: string
  workflow_name: string
}

const supabase = createBrowserClient()

export default function CommandMenu({ teamId, open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Search via React Query — handles race conditions, caching, deduplication
  const { data: searchResults } = useQuery({
    queryKey: ['command-search', teamId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || !teamId) {
        return {
          workflows: [] as WorkflowResult[],
          agents: [] as AgentResult[],
          runs: [] as RunResult[],
        }
      }

      const [workflowRes, agentRes, runRes] = await Promise.all([
        supabase
          .from('workflows')
          .select('id, name, emoji')
          .eq('team_id', teamId)
          .ilike('name', `%${debouncedQuery}%`)
          .limit(10),
        supabase
          .from('agents')
          .select('id, name')
          .eq('team_id', teamId)
          .ilike('name', `%${debouncedQuery}%`)
          .limit(10),
        supabase
          .from('workflow_runs')
          .select('id, status, workflow_id')
          .eq('team_id', teamId)
          .limit(10),
      ])

      return {
        workflows: workflowRes.data ?? [],
        agents: agentRes.data ?? [],
        runs: (runRes.data ?? []).map((r) => ({
          id: r.id,
          status: r.status,
          workflow_name: r.workflow_id.slice(0, 8),
        })),
      }
    },
    enabled: !!teamId && !!debouncedQuery,
    staleTime: 30_000,
  })

  const workflows = searchResults?.workflows ?? []
  const agents = searchResults?.agents ?? []
  const runs = searchResults?.runs ?? []

  const handleSelect = useCallback(
    (path: string) => {
      onOpenChange(false)
      setQuery('')
      router.push(path)
    },
    [onOpenChange, router]
  )

  const hasResults = workflows.length > 0 || agents.length > 0 || runs.length > 0

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search workflows, agents, runs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query && !hasResults && <CommandEmpty>No results found.</CommandEmpty>}
        {!query && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem onSelect={() => handleSelect('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('/workspace')}>
                <FolderKanban className="mr-2 h-4 w-4" />
                Workspace
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('/runs')}>
                <Play className="mr-2 h-4 w-4" />
                Runs
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => handleSelect('/workspace')}>
                <Plug className="mr-2 h-4 w-4" />
                Integrations
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {workflows.length > 0 && (
          <CommandGroup heading="Workflows">
            {workflows.map((w) => (
              <CommandItem key={w.id} onSelect={() => handleSelect(`/workflows/${w.id}/edit`)}>
                <FileText className="mr-2 h-4 w-4" />
                <span>
                  {w.emoji ?? ''} {w.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {agents.length > 0 && (
          <CommandGroup heading="Agents">
            {agents.map((a) => (
              <CommandItem key={a.id} onSelect={() => handleSelect(`/agents/${a.id}`)}>
                <Bot className="mr-2 h-4 w-4" />
                {a.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {runs.length > 0 && (
          <CommandGroup heading="Runs">
            {runs.map((r) => (
              <CommandItem key={r.id} onSelect={() => handleSelect(`/runs`)}>
                <Play className="mr-2 h-4 w-4" />
                <span>
                  {r.workflow_name} — {r.status}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
