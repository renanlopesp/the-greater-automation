'use client'

import { ChevronRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { TRIGGER_TYPES } from '@/lib/workflow-editor/trigger-metadata'
import type { TriggerType } from '@/lib/supabase/database.types'

interface TriggerSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: TriggerType) => void
}

export default function TriggerSelector({ open, onOpenChange, onSelect }: TriggerSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Select a trigger</DialogTitle>
          <DialogDescription>Choose a trigger type for your workflow</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search triggers..." />
          <CommandList>
            <CommandEmpty>No triggers found.</CommandEmpty>
            <CommandGroup>
              {TRIGGER_TYPES.map((t) => {
                const IconComponent = LucideIcons[
                  t.icon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                return (
                  <CommandItem
                    key={t.type}
                    value={t.name}
                    onSelect={() => {
                      onSelect(t.type)
                      onOpenChange(false)
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-muted-foreground text-xs">{t.description}</div>
                    </div>
                    {t.hasSubMenu && <ChevronRight className="text-muted-foreground h-4 w-4" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
