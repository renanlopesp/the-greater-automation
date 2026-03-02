'use client'

import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SplitButtonProps {
  onNewBlank: () => void
  onNewFromTemplate: () => void
}

export default function SplitButton({ onNewBlank, onNewFromTemplate }: SplitButtonProps) {
  return (
    <div className="flex">
      <Button size="sm" className="rounded-r-none" onClick={onNewBlank}>
        <Plus className="h-4 w-4" />
        Nova automação
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="border-primary-foreground/20 rounded-l-none border-l px-2">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onNewFromTemplate}>A partir de modelo</DropdownMenuItem>
          <DropdownMenuItem onClick={onNewBlank}>Automação em branco</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
