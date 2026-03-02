'use client'

import { ChevronRight } from 'lucide-react'
import { DynamicIcon } from '@/lib/workflow-editor/icon-registry'
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
import type { Database } from '@/lib/supabase/database.types'

type TriggerType = Database['public']['Enums']['trigger_type']

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
          <DialogTitle>Selecionar um gatilho</DialogTitle>
          <DialogDescription>Escolha um tipo de gatilho para sua automação</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Buscar gatilhos..." />
          <CommandList>
            <CommandEmpty>Nenhum gatilho encontrado.</CommandEmpty>
            <CommandGroup>
              {TRIGGER_TYPES.map((t) => {
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
                      <DynamicIcon name={t.icon} className="h-4 w-4" />
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
