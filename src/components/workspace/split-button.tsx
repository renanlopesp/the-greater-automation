'use client'

import { ChevronDown } from 'lucide-react'
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
      <Button className="rounded-r-none" onClick={onNewBlank}>
        New workflow
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-l-none border-l px-2">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onNewFromTemplate}>From template</DropdownMenuItem>
          <DropdownMenuItem onClick={onNewBlank}>Blank workflow</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
