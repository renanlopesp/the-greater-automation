'use client'

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
  CommandSeparator,
} from '@/components/ui/command'
import { STEP_TYPES, CONNECTED_APPS } from '@/lib/workflow-editor/step-metadata'
import type { StepType } from '@/lib/supabase/database.types'

interface StepSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: StepType) => void
}

export default function StepSelector({ open, onOpenChange, onSelect }: StepSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Add a step</DialogTitle>
          <DialogDescription>Choose a step type to add to your workflow</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search steps..." />
          <CommandList>
            <CommandEmpty>No steps found.</CommandEmpty>
            <CommandGroup heading="Steps">
              {STEP_TYPES.map((s) => {
                const IconComponent = LucideIcons[
                  s.icon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                return (
                  <CommandItem
                    key={s.type}
                    value={s.name}
                    onSelect={() => {
                      onSelect(s.type)
                      onOpenChange(false)
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-muted-foreground text-xs">{s.description}</div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Connected Apps">
              {CONNECTED_APPS.map((app) => {
                const IconComponent = LucideIcons[
                  app.icon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>
                return (
                  <CommandItem
                    key={app.id}
                    value={app.name}
                    onSelect={() => {
                      onSelect('app')
                      onOpenChange(false)
                    }}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium">{app.name}</span>
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
