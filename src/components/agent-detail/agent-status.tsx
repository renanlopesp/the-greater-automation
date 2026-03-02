import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AgentStatusProps {
  status: string | null
  isActive: boolean | null
}

export default function AgentStatus({ status, isActive }: AgentStatusProps) {
  const isRunning = status === 'running'
  const label = !isActive ? 'Inativo' : isRunning ? 'Em execução' : 'Ativo'

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-block h-2 w-2 shrink-0 rounded-full',
              !isActive && 'bg-muted-foreground/40',
              isActive && !isRunning && 'bg-emerald-500',
              isActive && isRunning && 'animate-pulse bg-emerald-500'
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
