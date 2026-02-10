'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface VariableChipProps {
  variable: string
  stepName?: string
  isValid?: boolean
  onRemove?: () => void
}

export function VariableChip({ variable, stepName, isValid = true, onRemove }: VariableChipProps) {
  const displayText = stepName || variable

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isValid ? 'default' : 'destructive'}
            className={cn(
              'inline-flex items-center gap-1 font-mono text-xs',
              !isValid && 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {displayText}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100"
                aria-label="Remove variable"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{`{{${variable}}}`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
